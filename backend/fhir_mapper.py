"""
fhir_mapper.py — Maps a patient DB row to an HL7 FHIR R4 Patient resource dict.

Name splitting strategy:
  - family  = last token of full_name
  - given   = all preceding tokens (handles single-word names gracefully)
"""
from __future__ import annotations
from typing import Any


def map_patient_to_fhir(patient: dict) -> dict:
    """
    Convert a patients DB row (dict) to a FHIR R4 Patient resource dict.
    The returned dict is valid JSON-serialisable FHIR R4.
    """
    pid = patient["patient_id"]   # e.g. "P-1001"
    full_name: str = (patient.get("full_name") or "").strip()

    # --- Name splitting -------------------------------------------
    tokens = full_name.split()
    if len(tokens) == 0:
        family = "Unknown"
        given = []
    elif len(tokens) == 1:
        family = tokens[0]
        given = []
    else:
        family = tokens[-1]
        given = tokens[:-1]

    # --- Gender mapping -------------------------------------------
    gender_map = {
        "male": "male",
        "female": "female",
        "other": "other",
        "unknown": "unknown",
    }
    fhir_gender = gender_map.get((patient.get("gender") or "unknown").lower(), "unknown")

    # --- Build resource -------------------------------------------
    resource: dict[str, Any] = {
        "resourceType": "Patient",
        "id": pid,
        "identifier": [
            {
                "system": "https://medibridge.local/patient-id",
                "value": pid,
            }
        ],
        "name": [
            {
                "use": "official",
                "family": family,
                **({"given": given} if given else {}),
            }
        ],
        "gender": fhir_gender,
    }

    # birthDate — FHIR uses YYYY-MM-DD
    if patient.get("dob"):
        dob = patient["dob"]
        if hasattr(dob, "isoformat"):
            resource["birthDate"] = dob.isoformat()
        else:
            resource["birthDate"] = str(dob)

    # telecom — phone
    if patient.get("phone"):
        resource["telecom"] = [
            {
                "system": "phone",
                "value": str(patient["phone"]),
                "use": "mobile",
            }
        ]

    # address — city + state + country default
    address: dict[str, str] = {}
    if patient.get("city"):
        address["city"] = patient["city"]
    if patient.get("state"):
        address["state"] = patient["state"]
    address["country"] = "India"
    if address:
        resource["address"] = [address]

    return resource
