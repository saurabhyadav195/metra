"""
METRA Backend — app/models/instrument.py
Pydantic models for instrument request/response bodies.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, model_validator


# ── Constants ─────────────────────────────────────────────────────────────────

InstrumentStatus = Literal[
    "registered",
    "under_evaluation",
    "evaluation_completed",
    "report_generated",
]

InstrumentType = Literal[
    "platform_scale",
    "bench_scale",
    "weighbridge",
    "counter_scale",
    "floor_scale",
    "hopper_scale",
    "other",
]


# ── Request bodies ─────────────────────────────────────────────────────────────

class CreateInstrumentRequest(BaseModel):
    # Instrument Information
    manufacturer: str = Field(..., min_length=1, max_length=255)
    manufacturer_address: Optional[str] = Field(None, max_length=500)
    model_designation: str = Field(..., min_length=1, max_length=255)
    serial_number: str = Field(..., min_length=1, max_length=100)
    instrument_type: InstrumentType
    accuracy_class: Optional[str] = Field(None, max_length=20)

    # Metrological Parameters
    max_capacity: float = Field(..., gt=0, description="Maximum capacity (Max) — must be > 0")
    min_capacity: Optional[float] = Field(None, ge=0, description="Minimum capacity (Min) — must be >= 0")
    verification_scale_interval: float = Field(..., gt=0, description="Verification scale interval (e)")
    actual_scale_interval: Optional[float] = Field(None, gt=0, description="Actual scale interval (d)")
    verification_intervals: Optional[int] = Field(None, gt=0, description="Number of verification intervals (n)")

    # Technical Information
    load_receptor_type: Optional[str] = Field(None, max_length=100)
    indicating_device_type: Optional[str] = Field(None, max_length=100)
    software_version: Optional[str] = Field(None, max_length=100)
    intended_use: Optional[str] = Field(None, max_length=500)

    # Submission Information
    submission_date: Optional[date] = None
    remarks: Optional[str] = Field(None, max_length=2000)

    @model_validator(mode="after")
    def validate_min_max(self) -> "CreateInstrumentRequest":
        if self.min_capacity is not None and self.min_capacity > self.max_capacity:
            raise ValueError("Minimum capacity (Min) must be less than or equal to Maximum capacity (Max).")
        return self


class UpdateInstrumentRequest(BaseModel):
    """All fields optional for PATCH."""
    manufacturer: Optional[str] = Field(None, min_length=1, max_length=255)
    manufacturer_address: Optional[str] = Field(None, max_length=500)
    model_designation: Optional[str] = Field(None, min_length=1, max_length=255)
    serial_number: Optional[str] = Field(None, min_length=1, max_length=100)
    instrument_type: Optional[InstrumentType] = None
    accuracy_class: Optional[str] = Field(None, max_length=20)

    max_capacity: Optional[float] = Field(None, gt=0)
    min_capacity: Optional[float] = Field(None, ge=0)
    verification_scale_interval: Optional[float] = Field(None, gt=0)
    actual_scale_interval: Optional[float] = Field(None, gt=0)
    verification_intervals: Optional[int] = Field(None, gt=0)

    load_receptor_type: Optional[str] = Field(None, max_length=100)
    indicating_device_type: Optional[str] = Field(None, max_length=100)
    software_version: Optional[str] = Field(None, max_length=100)
    intended_use: Optional[str] = Field(None, max_length=500)

    submission_date: Optional[date] = None
    remarks: Optional[str] = Field(None, max_length=2000)

    @model_validator(mode="after")
    def validate_min_max(self) -> "UpdateInstrumentRequest":
        if (
            self.min_capacity is not None
            and self.max_capacity is not None
            and self.min_capacity > self.max_capacity
        ):
            raise ValueError("Minimum capacity must be less than or equal to Maximum capacity.")
        return self


# ── Response bodies ────────────────────────────────────────────────────────────

class InstrumentResponse(BaseModel):
    id: str
    laboratory_id: str
    created_by: str

    manufacturer: str
    manufacturer_address: Optional[str]
    model_designation: str
    serial_number: str
    instrument_type: str
    accuracy_class: Optional[str]

    max_capacity: Optional[float]
    min_capacity: Optional[float]
    verification_scale_interval: Optional[float]
    actual_scale_interval: Optional[float]
    verification_intervals: Optional[int]

    load_receptor_type: Optional[str]
    indicating_device_type: Optional[str]
    software_version: Optional[str]
    intended_use: Optional[str]

    submission_date: Optional[date]
    remarks: Optional[str]
    status: str

    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class InstrumentListResponse(BaseModel):
    instruments: list[InstrumentResponse]
    total: int
