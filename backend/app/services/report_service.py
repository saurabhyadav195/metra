"""
METRA — app/services/report_service.py
Service for assembling complete report data models from evaluations.
"""

from typing import Dict, Any
from fastapi import HTTPException
from supabase import Client

from app.deps import AuthenticatedUser
from app.services.evaluation_service import EvaluationService


class ReportService:
    def __init__(self, client: Client):
        self.client = client
        self.eval_service = EvaluationService(client)

    async def get_report_data(self, evaluation_id: str, caller: AuthenticatedUser) -> Dict[str, Any]:
        """Assembles comprehensive data payload for certificate/evaluation report generation."""
        evaluation = await self.eval_service.get_evaluation_detail(evaluation_id, caller)
        instrument = evaluation.get("instruments") or {}

        # Fetch detailed test calculations & validations for all tests
        test_results = evaluation.get("test_results", [])
        detailed_tests = []

        for tr in test_results:
            detail = await self.eval_service.get_test_detail(evaluation_id, tr["test_id"], caller)
            detailed_tests.append(detail)

        return {
            "evaluation": {
                "id": evaluation["id"],
                "status": evaluation["status"],
                "oiml_edition": evaluation["oiml_edition"],
                "started_at": evaluation["started_at"],
                "completed_at": evaluation["completed_at"],
                "overall_result": evaluation.get("overall_result"),
                "notes": evaluation.get("notes")
            },
            "instrument": {
                "id": instrument.get("id"),
                "manufacturer": instrument.get("manufacturer"),
                "model": instrument.get("model_designation") or instrument.get("model"),
                "serial_number": instrument.get("serial_number"),
                "accuracy_class": instrument.get("accuracy_class"),
                "capacity": instrument.get("capacity"),
                "e_resolution": instrument.get("verification_scale_interval_e"),
                "d_resolution": instrument.get("scale_interval_d"),
                "unit": instrument.get("unit")
            },
            "test_results": detailed_tests,
            "metadata": {
                "generated_at": evaluation.get("updated_at"),
                "standard": "OIML R 76-1 (2006 E)",
                "laboratory_id": caller.laboratory_id,
                "engineer_id": evaluation.get("created_by")
            }
        }
