"""
worker.py — Background worker that processes pending change_log events.

Strategy:
  - Polls every POLL_INTERVAL seconds for pending events.
  - Uses SELECT FOR UPDATE SKIP LOCKED to prevent duplicate processing.
  - For each pending event:
      1. Marks it 'processing'
      2. Fetches the patient record
      3. Maps to FHIR R4 via fhir_mapper
      4. Validates via validator
      5. Upserts into fhir_resources
      6. Marks change_log entry 'done' or 'failed'
"""
from __future__ import annotations
import asyncio
import json
import logging
from typing import Optional

import asyncpg

from database import get_pool
from fhir_mapper import map_patient_to_fhir
from validator import validate_fhir_patient

logger = logging.getLogger("medibridge.worker")
POLL_INTERVAL = 3  # seconds


async def process_one_event(conn: asyncpg.Connection, event: asyncpg.Record) -> None:
    event_id: int = event["id"]
    patient_id: str = event["patient_id"]

    # Mark as processing
    await conn.execute(
        "UPDATE change_log SET status = 'processing' WHERE id = $1",
        event_id,
    )

    try:
        # Fetch patient
        row = await conn.fetchrow(
            "SELECT * FROM patients WHERE patient_id = $1", patient_id
        )
        if row is None:
            raise ValueError(f"Patient {patient_id} not found in DB")

        patient = dict(row)

        # Map to FHIR
        fhir_resource = map_patient_to_fhir(patient)

        # Validate
        is_valid, validation_msg = validate_fhir_patient(fhir_resource)
        validation_outcome = "valid" if is_valid else "invalid"

        fhir_json_str = json.dumps(fhir_resource)

        # Upsert fhir_resources
        await conn.execute(
            """
            INSERT INTO fhir_resources (patient_id, fhir_json, generated_at, validation_outcome)
            VALUES ($1, $2::jsonb, NOW(), $3)
            ON CONFLICT (patient_id) DO UPDATE
                SET fhir_json = EXCLUDED.fhir_json,
                    generated_at = NOW(),
                    validation_outcome = EXCLUDED.validation_outcome
            """,
            patient_id,
            fhir_json_str,
            validation_outcome,
        )

        # Mark done
        await conn.execute(
            """
            UPDATE change_log
            SET status = 'done',
                validation_status = $1,
                error_details = $2
            WHERE id = $3
            """,
            validation_outcome,
            None if is_valid else validation_msg,
            event_id,
        )
        logger.info(
            "Event %d (patient %s, %s): %s — %s",
            event_id, patient_id, event["operation"], validation_outcome, validation_msg,
        )

    except Exception as exc:
        logger.error("Event %d failed: %s", event_id, exc)
        await conn.execute(
            """
            UPDATE change_log
            SET status = 'failed',
                validation_status = 'invalid',
                error_details = $1
            WHERE id = $2
            """,
            str(exc),
            event_id,
        )


async def worker_loop() -> None:
    """Continuously poll for pending change_log events and process them."""
    logger.info("MediBridge background worker started (poll every %ds)", POLL_INTERVAL)

    while True:
        try:
            pool = await get_pool()
            async with pool.acquire() as conn:
                async with conn.transaction():
                    # Lock one pending row, skip already-locked rows
                    events = await conn.fetch(
                        """
                        SELECT id, patient_id, operation
                        FROM change_log
                        WHERE status = 'pending'
                        ORDER BY event_ts ASC
                        LIMIT 5
                        FOR UPDATE SKIP LOCKED
                        """
                    )
                    for event in events:
                        await process_one_event(conn, event)
        except asyncpg.PostgresConnectionError as exc:
            logger.warning("DB connection error in worker: %s — will retry", exc)
        except Exception as exc:
            logger.error("Unexpected worker error: %s", exc)

        await asyncio.sleep(POLL_INTERVAL)
