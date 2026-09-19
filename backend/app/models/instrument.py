""" 
METRA Backend — app/models/instrument.py
Pydantic models for instrument request/response bodies.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Dict, List, Literal, Optional

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
    model: str = Field(..., min_length=1, max_length=255)
    serial_number: str = Field(..., min_length=1, max_length=100)
    instrument_type: InstrumentType
    accuracy_class: Optional[str] = Field(None, max_length=20)

    # Metrological Parameters
    max_capacity: float = Field(..., gt=0, description="Maximum capacity (Max) — must be > 0")
    min_capacity: Optional[float] = Field(None, ge=0, description="Minimum capacity (Min) — must be >= 0")
    verification_scale_interval: float = Field(..., gt=0, description="Verification scale interval (e)")
    actual_scale_interval: Optional[float] = Field(None, gt=0, description="Actual scale interval (d)")
    verification_intervals: Optional[int] = Field(None, gt=0, description="Number of verification intervals (n)")
    # Multi-interval support — ordered list of {max_load, e} for multi-interval/multi-range instruments
    weighing_intervals: Optional[List[Dict[str, float]]] = Field(
        None,
        description="Ordered list of partial weighing ranges [{max_load, e}] for multi-interval instruments (OIML T.3.2.6)"
    )

    # Technical Information
    load_receptor_type: Optional[str] = Field(None, max_length=100)
    indicating_device_type: Optional[str] = Field(None, max_length=100)
    software_version: Optional[str] = Field(None, max_length=100)
    intended_use: Optional[str] = Field(None, max_length=500)

    # Submission Information
    submission_date: Optional[date] = None
    remarks: Optional[str] = Field(None, max_length=2000)

    @model_validator(mode="after")
    def validate_instrument_params(self) -> "CreateInstrumentRequest":
        if self.min_capacity is not None and self.min_capacity > self.max_capacity:
            raise ValueError("Minimum capacity (Min) must be less than or equal to Maximum capacity (Max).")
        if self.weighing_intervals is not None:
            self._validate_intervals(self.weighing_intervals, self.max_capacity)
        return self

    @staticmethod
    def _validate_intervals(intervals: List[Dict[str, float]], max_capacity: float) -> None:
        if not intervals:
            raise ValueError("weighing_intervals must contain at least one interval if provided.")
        for iv in intervals:
            if "max_load" not in iv or "e" not in iv:
                raise ValueError("Each weighing interval must have 'max_load' and 'e' keys.")
            if iv["max_load"] <= 0:
                raise ValueError("Interval max_load must be positive.")
            if iv["e"] <= 0:
                raise ValueError("Interval e must be positive.")
        sorted_ivs = sorted(intervals, key=lambda x: x["max_load"])
        if abs(sorted_ivs[-1]["max_load"] - max_capacity) > 1e-9:
            raise ValueError(
                f"The last interval max_load ({sorted_ivs[-1]['max_load']}) must equal max_capacity ({max_capacity})."
            )


class UpdateInstrumentRequest(BaseModel):
    """All fields optional for PATCH."""
    manufacturer: Optional[str] = Field(None, min_length=1, max_length=255)
    manufacturer_address: Optional[str] = Field(None, max_length=500)
    model: Optional[str] = Field(None, min_length=1, max_length=255)
    serial_number: Optional[str] = Field(None, min_length=1, max_length=100)
    instrument_type: Optional[InstrumentType] = None
    accuracy_class: Optional[str] = Field(None, max_length=20)

    max_capacity: Optional[float] = Field(None, gt=0)
    min_capacity: Optional[float] = Field(None, ge=0)
    verification_scale_interval: Optional[float] = Field(None, gt=0)
    actual_scale_interval: Optional[float] = Field(None, gt=0)
    verification_intervals: Optional[int] = Field(None, gt=0)
    weighing_intervals: Optional[List[Dict[str, float]]] = Field(
        None,
        description="Ordered list of partial weighing ranges [{max_load, e}] for multi-interval instruments"
    )

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
        if self.weighing_intervals is not None and self.max_capacity is not None:
            CreateInstrumentRequest._validate_intervals(self.weighing_intervals, self.max_capacity)
        return self


# ── Response bodies ────────────────────────────────────────────────────────────

class InstrumentResponse(BaseModel):
    id: str
    laboratory_id: str
    created_by: str

    manufacturer: str
    manufacturer_address: Optional[str]
    model: str
    serial_number: str
    instrument_type: str
    accuracy_class: Optional[str]

    max_capacity: Optional[float]
    min_capacity: Optional[float]
    verification_scale_interval: Optional[float]
    actual_scale_interval: Optional[float]
    verification_intervals: Optional[int]
    weighing_intervals: Optional[List[Dict[str, float]]] = None

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
