"""
routers/dashboard.py — Dashboard statistics endpoint.
"""
from __future__ import annotations

from fastapi import APIRouter

from database import get_pool
from models import DashboardStats

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats():
    """Return summary counts for the dashboard cards."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        total_patients: int = await conn.fetchval("SELECT COUNT(*) FROM patients")

        successfully_converted: int = await conn.fetchval(
            "SELECT COUNT(*) FROM fhir_resources WHERE validation_outcome = 'valid'"
        )

        # Pending = patients with no FHIR resource yet OR with pending/processing change_log
        pending_conversion: int = await conn.fetchval(
            """
            SELECT COUNT(DISTINCT p.patient_id)
            FROM patients p
            WHERE EXISTS (
                SELECT 1 FROM change_log cl
                WHERE cl.patient_id = p.patient_id
                  AND cl.status IN ('pending', 'processing')
            )
            """
        )

        failed_validation: int = await conn.fetchval(
            """
            SELECT COUNT(*) FROM fhir_resources WHERE validation_outcome = 'invalid'
            """
        )

        return DashboardStats(
            total_patients=total_patients,
            successfully_converted=successfully_converted,
            pending_conversion=pending_conversion,
            failed_validation=failed_validation,
        )
