"""
METRA — app/engine/models.py
Pydantic data models for the OIML R-76 Evaluation Engine.
"""

from typing import Dict, List, Any, Optional, Union
from enum import Enum
from pydantic import BaseModel, Field


class ApplicabilityStatus(str, Enum):
    APPLICABLE = "APPLICABLE"
    NOT_APPLICABLE = "NOT_APPLICABLE"
    MANUAL_REVIEW = "MANUAL_REVIEW"


class TestExecutionStatus(str, Enum):
    NOT_STARTED = "NOT_STARTED"
    IN_PROGRESS = "IN_PROGRESS"
    PASS = "PASS"
    FAIL = "FAIL"
    MANUAL_REVIEW = "MANUAL_REVIEW"
    NOT_APPLICABLE = "NOT_APPLICABLE"


class OverallEvaluationStatus(str, Enum):
    DRAFT = "DRAFT"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED_PASS = "PASS"
    COMPLETED_FAIL = "FAIL"
    REQUIRES_REVIEW = "REQUIRES_REVIEW"


class EvaluationContext(BaseModel):
    """Context derived from Instrument specifications used for rule evaluation."""
    instrument_id: str
    serial_number: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    accuracy_class: str = "III"  # I, II, III, IIII
    max_capacity: float  # Max load in main unit
    min_capacity: float = 0.0  # Min load
    e_resolution: float  # Verification scale interval e
    d_resolution: float  # Scale interval d
    n_intervals: Optional[int] = None  # Number of verification scale intervals n = Max / e
    unit: str = "kg"
    instrument_type: Optional[str] = None  # e.g., non_automatic, self_indicating, etc.
    power_source: Optional[str] = None  # mains, battery, solar
    has_tare: bool = True
    has_zero_tracking: bool = False
    has_initial_zero_setting: bool = True
    has_delta_t_sensor: bool = False
    is_electronic: bool = True
    tare_type: Optional[str] = None  # subtractive, additive
    multi_range: bool = False
    verification_type: str = "initial"  # initial, service


class MPEResult(BaseModel):
    """Result of an MPE lookup for a given load and verification type."""
    rule_id: str
    load: float
    load_e_ratio: float
    mpe_e: float  # MPE in terms of e (e.g. 0.5, 1.0, 1.5)
    mpe_value: float  # MPE in engineering units (e.g., mpe_e * e)
    unit: str
    verification_type: str  # initial vs service
    source: Dict[str, Any] = Field(default_factory=dict)


class CalculationResult(BaseModel):
    """Result of a formula calculation within a test."""
    calculation_id: str
    name: str
    formula: str
    inputs: Dict[str, Any]
    output: Union[float, int, bool, Dict[str, Any]]
    unit: Optional[str] = None
    decision: Optional[str] = None  # PASS, FAIL, WARNING, N/A
    limit: Optional[Union[float, str]] = None
    source: Dict[str, Any] = Field(default_factory=dict)


class ValidationResult(BaseModel):
    """Result of input validation check against test constraints."""
    rule_id: str
    param_name: Optional[str] = None
    status: str  # PASS, FAIL, WARNING
    message: str


class RuleTraceEntry(BaseModel):
    """Audit entry recording the exact OIML reference and explanation for a decision."""
    rule_id: str
    name: str
    standard: str = "OIML R 76-1"
    edition: str = "2006 (E)"
    section: Optional[str] = None
    page: Optional[int] = None
    table: Optional[str] = None
    explanation: str


class TestResult(BaseModel):
    """Evaluated result for a single OIML test."""
    test_id: str
    test_name: str
    clause: str
    applicability: ApplicabilityStatus
    applicability_reason: Optional[str] = None
    status: TestExecutionStatus = TestExecutionStatus.NOT_STARTED
    manual_result: Optional[str] = None  # PASS, FAIL, N/A for manual review tests
    observations: Dict[str, Any] = Field(default_factory=dict)
    validations: List[ValidationResult] = Field(default_factory=list)
    mpe_details: List[MPEResult] = Field(default_factory=list)
    calculations: List[CalculationResult] = Field(default_factory=list)
    rule_trace: List[RuleTraceEntry] = Field(default_factory=list)
    summary_message: Optional[str] = None
    calculated_at: Optional[str] = None


class EvaluationResult(BaseModel):
    """Final aggregated evaluation result for an instrument."""
    evaluation_id: str
    instrument_id: str
    overall_status: OverallEvaluationStatus
    total_tests: int
    applicable_tests: int
    passed_tests: int
    failed_tests: int
    review_required_tests: int
    not_applicable_tests: int
    test_results: List[TestResult] = Field(default_factory=list)
    completed_at: Optional[str] = None
