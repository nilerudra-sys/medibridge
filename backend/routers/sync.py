"""
routers/sync.py — Sync monitor endpoints (change_log).
"""
from __future__ import annotations
from typing import List, Optional

from fastapi import APIRouter, Query

from database import get_pool
from models import SyncEventResponse

router = APIRouter(prefix="/sync", tags=["Sync"])


@router.get("/events", response_model=List[SyncEventResponse])
async def get_sync_events(
    limit: int = Query(100, ge=1, le=500),
    patient_id: Optional[str] = Query(None),
):
    """Return change_log events, newest first."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        if patient_id:
            rows = await conn.fetch(
                """
                SELECT * FROM change_log
                WHERE patient_id = $1
                ORDER BY event_ts DESC
                LIMIT $2
                """,
                patient_id,
                limit,
            )
        else:
            rows = await conn.fetch(
                "SELECT * FROM change_log ORDER BY event_ts DESC LIMIT $1",
                limit,
            )
        return [SyncEventResponse(**dict(r)) for r in rows]
