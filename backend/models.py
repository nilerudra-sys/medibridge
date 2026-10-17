"""
models.py — Pydantic request/response models.
"""
from __future__ import annotations
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, field_validator


VALID_GENDERS = {"male", "female", "other", "unknown"}


class PatientCreate(BaseModel):
    full_name: str
    dob: date
    gender: str
    phone: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, v: str) -> str:
        v = v.lower().strip()
        if v not in VALID_GENDERS:
            raise ValueError(f"gender must be one of {VALID_GENDERS}")
        return v

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("full_name cannot be empty")
        return v


class PatientUpdate(BaseModel):
    full_name: Optional[str] = None
    dob: Optional[date] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.lower().strip()
        if v not in VALID_GENDERS:
            raise ValueError(f"gender must be one of {VALID_GENDERS}")
        return v


class PatientResponse(BaseModel):
    id: int
    patient_id: str
    full_name: str
    dob: date
    gender: str
    phone: Optional[str]
    city: Optional[str]
    state: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SyncEventResponse(BaseModel):
    id: int
    patient_id: str
    operation: str
    event_ts: datetime
    status: str
    validation_status: Optional[str]
    error_details: Optional[str]

    model_config = {"from_attributes": True}


class DashboardStats(BaseModel):
    total_patients: int
    successfully_converted: int
    pending_conversion: int
    failed_validation: int
