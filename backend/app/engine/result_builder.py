"""
METRA — app/engine/result_builder.py
Aggregates individual test results into a complete EvaluationResult object.
"""

from typing import List, Optional
from datetime import datetime
from app.engine.models import (
    TestResult, EvaluationResult, OverallEvaluationStatus,
    TestExecutionStatus, ApplicabilityStatus
)


class ResultBuilder:
    @staticmethod
    def build_evaluation_result(
        evaluation_id: str,
        instrument_id: str,
        test_results: List[TestResult]
    ) -> EvaluationResult:
        total = len(test_results)
        applicable = sum(1 for t in test_results if t.applicability != ApplicabilityStatus.NOT_APPLICABLE)
        passed = sum(1 for t in test_results if t.status == TestExecutionStatus.PASS)
        failed = sum(1 for t in test_results if t.status == TestExecutionStatus.FAIL)
        review = sum(1 for t in test_results if t.status == TestExecutionStatus.MANUAL_REVIEW or t.status == TestExecutionStatus.IN_PROGRESS)
        not_applicable = sum(1 for t in test_results if t.applicability == ApplicabilityStatus.NOT_APPLICABLE or t.status == TestExecutionStatus.NOT_APPLICABLE)

        if failed > 0:
            overall = OverallEvaluationStatus.COMPLETED_FAIL
        elif review > 0:
            overall = OverallEvaluationStatus.REQUIRES_REVIEW
        elif passed > 0 and (passed + not_applicable == total):
            overall = OverallEvaluationStatus.COMPLETED_PASS
        else:
            overall = OverallEvaluationStatus.IN_PROGRESS

        return EvaluationResult(
            evaluation_id=evaluation_id,
            instrument_id=instrument_id,
            overall_status=overall,
            total_tests=total,
            applicable_tests=applicable,
            passed_tests=passed,
            failed_tests=failed,
            review_required_tests=review,
            not_applicable_tests=not_applicable,
            test_results=test_results,
            completed_at=datetime.utcnow().isoformat() if overall in (OverallEvaluationStatus.COMPLETED_PASS, OverallEvaluationStatus.COMPLETED_FAIL) else None
        )
