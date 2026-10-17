"""
routers/fhir.py — FHIR R4 resource endpoints.
Returns FHIR-shaped JSON (Patient resources and Bundles).
"""
from __future__ import annotations
import json
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from database import get_pool

router = APIRouter(prefix="/fhir", tags=["FHIR"])

FHIR_CONTENT_TYPE = "application/fhir+json; fhirVersion=4.0"


def _fhir_response(data: dict, status_code: int = 200) -> JSONResponse:
    return JSONResponse(content=data, status_code=status_code, media_type=FHIR_CONTENT_TYPE)


@router.get("/Patient/{patient_id}")
async def get_fhir_patient(patient_id: str):
    """Retrieve the generated FHIR R4 Patient resource for a given patient_id."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM fhir_resources WHERE patient_id = $1", patient_id
        )
        if not row:
            raise HTTPException(
                status_code=404,
                detail=f"No FHIR resource found for patient {patient_id}. "
                       "The background worker may still be processing this patient.",
            )
        resource = json.loads(row["fhir_json"])
        # Add extension for validation outcome
        resource["_medibridge_validation"] = row["validation_outcome"]
        return _fhir_response(resource)


@router.get("/Patient")
async def list_fhir_patients():
    """Return a FHIR R4 Bundle of all generated Patient resources."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT * FROM fhir_resources ORDER BY generated_at DESC"
        )
        entries = []
        for row in rows:
            resource = json.loads(row["fhir_json"])
            entries.append(
                {
                    "fullUrl": f"https://medibridge.local/fhir/Patient/{row['patient_id']}",
                    "resource": resource,
                }
            )

        bundle = {
            "resourceType": "Bundle",
            "id": "medibridge-patient-bundle",
            "type": "searchset",
            "total": len(entries),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "entry": entries,
        }
        return _fhir_response(bundle)
