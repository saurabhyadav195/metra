"""
METRA Backend — app/routers/evaluations.py

REST endpoints for OIML R-76 evaluation workflows and test executions.
Enforces laboratory isolation on all operations.
"""

from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from supabase import Client

from app.deps import AuthenticatedUser, get_authenticated_user, get_supabase_client
from app.services.evaluation_service import EvaluationService
from app.services.report_service import ReportService


router = APIRouter()


class EnvironmentalConditionsPayload(BaseModel):
    temperature_c: Optional[float] = None
    relative_humidity_percent: Optional[float] = None
    relative_humidity_pct: Optional[float] = None
    atmospheric_pressure_hpa: Optional[float] = None
    test_location: Optional[str] = None
    notes: Optional[str] = None


class CreateEvaluationRequest(BaseModel):
    instrument_id: str
    evaluation_date: Optional[str] = None
    oiml_version: Optional[str] = None
    oiml_edition: Optional[str] = None
    environmental_conditions: Optional[EnvironmentalConditionsPayload] = None


class SaveObservationsRequest(BaseModel):
    observations: Dict[str, Any]


class CompleteTestRequest(BaseModel):
    manual_result: Optional[str] = None
    comment: Optional[str] = None


class EnvironmentalConditionsRequest(BaseModel):
    temperature_c: Optional[float] = None
    relative_humidity_pct: Optional[float] = None
    atmospheric_pressure_hpa: Optional[float] = None
    test_location: Optional[str] = None
    start_datetime: Optional[str] = None
    end_datetime: Optional[str] = None
    notes: Optional[str] = None


class UpdateEvaluationRequest(BaseModel):
    notes: Optional[str] = None
    evaluation_date: Optional[str] = None


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_evaluation(
    body: CreateEvaluationRequest,
    caller: AuthenticatedUser = Depends(get_authenticated_user),
    client: Client = Depends(get_supabase_client)
):
    """Creates a new OIML R-76 evaluation for an instrument."""
    service = EvaluationService(client)
    return await service.create_evaluation(body, caller)


@router.get("")
async def list_evaluations(
    caller: AuthenticatedUser = Depends(get_authenticated_user),
    client: Client = Depends(get_supabase_client)
):
    """Lists evaluations for the authenticated user's laboratory."""
    service = EvaluationService(client)
    return await service.list_evaluations(caller)


@router.get("/{evaluation_id}")
async def get_evaluation(
    evaluation_id: str,
    caller: AuthenticatedUser = Depends(get_authenticated_user),
    client: Client = Depends(get_supabase_client)
):
    """Retrieves full evaluation record with instrument info and test results summary."""
    service = EvaluationService(client)
    return await service.get_evaluation_detail(evaluation_id, caller)


@router.patch("/{evaluation_id}")
async def update_evaluation(
    evaluation_id: str,
    body: UpdateEvaluationRequest,
    caller: AuthenticatedUser = Depends(get_authenticated_user),
    client: Client = Depends(get_supabase_client)
):
    """Updates evaluation metadata (notes, evaluation date)."""
    service = EvaluationService(client)
    return await service.update_evaluation_metadata(evaluation_id, body.dict(exclude_none=True), caller)


@router.patch("/{evaluation_id}/environmental")
async def save_environmental_conditions(
    evaluation_id: str,
    body: EnvironmentalConditionsRequest,
    caller: AuthenticatedUser = Depends(get_authenticated_user),
    client: Client = Depends(get_supabase_client)
):
    """Saves environmental conditions for an evaluation (temperature, humidity, pressure, location, dates)."""
    service = EvaluationService(client)
    return await service.save_environmental_conditions(
        evaluation_id,
        body.dict(exclude_none=True),
        caller
    )


@router.get("/{evaluation_id}/tests/{test_id}")
async def get_test_detail(
    evaluation_id: str,
    test_id: str,
    caller: AuthenticatedUser = Depends(get_authenticated_user),
    client: Client = Depends(get_supabase_client)
):
    """Retrieves single test execution details, observations, and calculations."""
    service = EvaluationService(client)
    return await service.get_test_detail(evaluation_id, test_id, caller)


@router.post("/{evaluation_id}/tests/{test_id}")
async def save_test_observations(
    evaluation_id: str,
    test_id: str,
    body: SaveObservationsRequest,
    caller: AuthenticatedUser = Depends(get_authenticated_user),
    client: Client = Depends(get_supabase_client)
):
    """Saves observation data for a specific test execution."""
    service = EvaluationService(client)
    return await service.save_observations(evaluation_id, test_id, body.observations, caller)


@router.post("/{evaluation_id}/tests/{test_id}/calculate")
async def calculate_test(
    evaluation_id: str,
    test_id: str,
    caller: AuthenticatedUser = Depends(get_authenticated_user),
    client: Client = Depends(get_supabase_client)
):
    """Triggers deterministic engine calculation for a test."""
    service = EvaluationService(client)
    res = await service.calculate_test(evaluation_id, test_id, caller)
    # result may be a dict or a pydantic model
    if hasattr(res, "dict"):
        return res.dict()
    return res


@router.post("/{evaluation_id}/tests/{test_id}/complete")
async def complete_test(
    evaluation_id: str,
    test_id: str,
    body: CompleteTestRequest,
    caller: AuthenticatedUser = Depends(get_authenticated_user),
    client: Client = Depends(get_supabase_client)
):
    """Marks manual verification test result and comment."""
    service = EvaluationService(client)
    return await service.complete_test(evaluation_id, test_id, body.manual_result, body.comment, caller)


@router.post("/{evaluation_id}/evaluate")
async def finalize_evaluation(
    evaluation_id: str,
    caller: AuthenticatedUser = Depends(get_authenticated_user),
    client: Client = Depends(get_supabase_client)
):
    """Finalizes overall evaluation result status."""
    service = EvaluationService(client)
    return await service.finalize_evaluation(evaluation_id, caller)


@router.get("/{evaluation_id}/report-data")
async def get_report_data(
    evaluation_id: str,
    caller: AuthenticatedUser = Depends(get_authenticated_user),
    client: Client = Depends(get_supabase_client)
):
    """Retrieves full assembled report data model for certificate generation."""
    service = ReportService(client)
    return await service.get_report_data(evaluation_id, caller)
