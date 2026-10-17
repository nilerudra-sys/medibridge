"""
routers/patients.py — Patient CRUD endpoints.
"""
from __future__ import annotations
import random
import string
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query
from database import get_pool
from models import PatientCreate, PatientUpdate, PatientResponse

router = APIRouter(prefix="/patients", tags=["Patients"])


def _generate_patient_id() -> str:
    """Generate a patient ID like P-1042."""
    num = random.randint(1000, 9999)
    return f"P-{num}"


def _row_to_dict(row) -> dict:
    return dict(row)


@router.post("", response_model=PatientResponse, status_code=201)
async def create_patient(body: PatientCreate):
    pool = await get_pool()
    async with pool.acquire() as conn:
        # Ensure unique patient_id
        for _ in range(10):
            pid = _generate_patient_id()
            existing = await conn.fetchval(
                "SELECT id FROM patients WHERE patient_id = $1", pid
            )
            if not existing:
                break
        else:
            raise HTTPException(status_code=500, detail="Could not generate unique patient ID")

        row = await conn.fetchrow(
            """
            INSERT INTO patients (patient_id, full_name, dob, gender, phone, city, state)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
            """,
            pid,
            body.full_name,
            body.dob,
            body.gender,
            body.phone,
            body.city,
            body.state,
        )
        return PatientResponse(**_row_to_dict(row))


@router.get("", response_model=List[PatientResponse])
async def list_patients(
    search: Optional[str] = Query(None, description="Search by name or patient_id"),
):
    pool = await get_pool()
    async with pool.acquire() as conn:
        if search:
            rows = await conn.fetch(
                """
                SELECT * FROM patients
                WHERE full_name ILIKE $1 OR patient_id ILIKE $1
                ORDER BY updated_at DESC
                """,
                f"%{search}%",
            )
        else:
            rows = await conn.fetch(
                "SELECT * FROM patients ORDER BY updated_at DESC"
            )
        return [PatientResponse(**_row_to_dict(r)) for r in rows]


@router.get("/{patient_id}", response_model=PatientResponse)
async def get_patient(patient_id: str):
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM patients WHERE patient_id = $1", patient_id
        )
        if not row:
            raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")
        return PatientResponse(**_row_to_dict(row))


@router.put("/{patient_id}", response_model=PatientResponse)
async def update_patient(patient_id: str, body: PatientUpdate):
    pool = await get_pool()
    async with pool.acquire() as conn:
        existing = await conn.fetchrow(
            "SELECT * FROM patients WHERE patient_id = $1", patient_id
        )
        if not existing:
            raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")

        # Build dynamic update
        updates = body.model_dump(exclude_none=True)
        if not updates:
            return PatientResponse(**_row_to_dict(existing))

        fields = []
        values = []
        for i, (k, v) in enumerate(updates.items(), start=1):
            fields.append(f"{k} = ${i}")
            values.append(v)

        values.append(patient_id)
        set_clause = ", ".join(fields)
        row = await conn.fetchrow(
            f"UPDATE patients SET {set_clause} WHERE patient_id = ${len(values)} RETURNING *",
            *values,
        )
        return PatientResponse(**_row_to_dict(row))
