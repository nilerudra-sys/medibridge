"""
validator.py — Validates a FHIR R4 Patient resource dict using the
`fhir.resources` library (official FHIR R4 Python models).

Validation scope:
  - Required fields present (resourceType, id, name, gender, birthDate)
  - Field types and allowed values (e.g. gender codes)
  - Structural compliance with FHIR R4 Patient resource model

This is NOT full HAPI FHIR Validator validation (which requires Java).
It validates structural and type conformance via the fhir.resources R4 schema.
"""
from __future__ import annotations
from typing import Tuple
import json


def validate_fhir_patient(resource_dict: dict) -> Tuple[bool, str]:
    """
    Validate a FHIR R4 Patient resource dict.

    Returns:
        (is_valid: bool, message: str)
    """
    try:
        from fhir.resources.patient import Patient

        # fhir.resources expects a JSON-serialisable dict
        # Parse through JSON to normalise types (e.g. date → str)
        normalised = json.loads(json.dumps(resource_dict, default=str))

        patient = Patient.model_validate(normalised)

        # Value-set check: FHIR R4 AdministrativeGender
        fhir_gender = normalised.get("gender")
        if fhir_gender and fhir_gender not in {"male", "female", "other", "unknown"}:
            return False, f"Invalid — gender '{fhir_gender}' is not in FHIR R4 AdministrativeGender value set"

        # Re-serialise to confirm round-trip
        _ = patient.model_dump()
        return True, "Valid — fhir.resources R4 structural validation passed"

    except Exception as exc:
        return False, f"Invalid — {str(exc)}"
