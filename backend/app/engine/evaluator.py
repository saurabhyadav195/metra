"""
METRA — app/engine/evaluator.py
Orchestrator for evaluating a single test against an instrument context and test observations.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
from app.engine.models import (
    EvaluationContext, TestResult, ApplicabilityStatus, TestExecutionStatus,
    RuleTraceEntry, ValidationResult, MPEResult, CalculationResult
)
from app.engine.rule_loader import get_rule_loader
from app.engine.applicability import ApplicabilityEngine
from app.engine.validator import InputValidator
from app.engine.mpe_engine import MPEEngine
from app.engine.calculator import CalculationEngine


class RuleEvaluator:
    def __init__(self):
        self.loader = get_rule_loader()
        self.applicability_engine = ApplicabilityEngine()
        self.validator = InputValidator()
        self.mpe_engine = MPEEngine()
        self.calculator = CalculationEngine()

    def evaluate_test(
        self,
        test_id: str,
        context: EvaluationContext,
        observations: Dict[str, Any],
        manual_result: Optional[str] = None
    ) -> TestResult:
        """
        Full evaluation pipeline for a test:
        Applicability -> Validation -> MPE -> Calculations -> Rule Trace -> Final Status
        """
        test_def = self.loader.get_test(test_id)
        if not test_def:
            raise ValueError(f"Test definition '{test_id}' not found in rule registry.")

        test_name = test_def.get("test_name", test_id)
        source = test_def.get("source", {})
        clause = source.get("section", "N/A")

        # 1. Applicability Check
        app_status, app_reason = self.applicability_engine.evaluate_test_applicability(test_def, context)
        if app_status == ApplicabilityStatus.NOT_APPLICABLE:
            return TestResult(
                test_id=test_id,
                test_name=test_name,
                clause=clause,
                applicability=ApplicabilityStatus.NOT_APPLICABLE,
                applicability_reason=app_reason,
                status=TestExecutionStatus.NOT_APPLICABLE,
                observations=observations,
                summary_message=f"Test not applicable: {app_reason}",
                calculated_at=datetime.utcnow().isoformat()
            )

        # 2. Input Validation
        validations: List[ValidationResult] = []
        # Validate instrument context parameters
        validations.extend(self.validator.validate_instrument_context(context))
        # Validate observation inputs against test schema if observations provided
        if observations:
            validations.extend(self.validator.validate_test_observations(test_def, observations))

        val_fails = [v for v in validations if v.status == "FAIL"]

        # 3. MPE Lookup (if test involves load weighing)
        mpe_details: List[MPEResult] = []
        test_load = observations.get("L") or observations.get("test_load") or (context.max_capacity * 0.5)
        if isinstance(test_load, (int, float)) and test_load > 0:
            mpe = self.mpe_engine.calculate_mpe(
                accuracy_class=context.accuracy_class,
                load=float(test_load),
                e_resolution=context.e_resolution,
                unit=context.unit,
                verification_type=context.verification_type
            )
            mpe_details.append(mpe)

        primary_mpe = mpe_details[0] if mpe_details else None

        # 4. Calculation Execution
        calculations: List[CalculationResult] = []
        calc_rules = test_def.get("calculations", [])
        for calc_id in calc_rules:
            res_list = self.calculator.calculate_rule(
                rule_id=calc_id,
                observations=observations,
                context=context,
                mpe_result=primary_mpe
            )
            calculations.extend(res_list)

        # Handle custom repeatability or eccentricity inline calculation if calc rules array is empty
        if not calculations and "repeatability_readings" in observations:
            readings = observations.get("repeatability_readings", [])
            if isinstance(readings, list) and len(readings) >= 2:
                diff = max(readings) - min(readings)
                decision = "PASS"
                limit_val = primary_mpe.mpe_value if primary_mpe else context.e_resolution
                if primary_mpe and diff > primary_mpe.mpe_value:
                    decision = "FAIL"

                calculations.append(CalculationResult(
                    calculation_id="CALC_REPEATABILITY_RANGE",
                    name="Repeatability Max-Min Difference",
                    formula="max(readings) - min(readings)",
                    inputs={"readings": readings},
                    output=diff,
                    unit=context.unit,
                    decision=decision,
                    limit=limit_val,
                    source=source
                ))

        # 5. Build OIML Rule Trace
        rule_trace: List[RuleTraceEntry] = []
        rule_trace.append(RuleTraceEntry(
            rule_id=test_id,
            name=test_name,
            standard=source.get("standard", "OIML R 76-1"),
            edition=source.get("edition", "2006 (E)"),
            section=source.get("section"),
            page=source.get("page"),
            explanation=f"Evaluated clause {clause} under OIML R 76-1 requirements."
        ))

        for c in calculations:
            if c.decision:
                rule_trace.append(RuleTraceEntry(
                    rule_id=c.calculation_id,
                    name=c.name,
                    section=c.source.get("section", source.get("section")),
                    page=c.source.get("page", source.get("page")),
                    explanation=f"{c.name} calculated as {c.output} {c.unit or ''}. Limit: {c.limit}. Decision: {c.decision}."
                ))

        # 6. Determine Final Test Status
        final_status = TestExecutionStatus.NOT_STARTED

        if val_fails:
            final_status = TestExecutionStatus.FAIL
            summary = f"Input validation failed: {val_fails[0].message}"
        elif calculations:
            calc_fails = [c for c in calculations if c.decision == "FAIL"]
            if calc_fails:
                final_status = TestExecutionStatus.FAIL
                summary = f"Calculation failed requirement: {calc_fails[0].name}"
            else:
                final_status = TestExecutionStatus.PASS
                summary = f"All calculation requirements passed successfully."
        elif manual_result:
            if manual_result.upper() == "PASS":
                final_status = TestExecutionStatus.PASS
                summary = "Manual review marked PASS by engineer."
            elif manual_result.upper() == "FAIL":
                final_status = TestExecutionStatus.FAIL
                summary = "Manual review marked FAIL by engineer."
            else:
                final_status = TestExecutionStatus.NOT_APPLICABLE
                summary = "Manual review marked N/A."
        else:
            # If test has no automatic calculation and no manual result provided yet
            final_status = TestExecutionStatus.MANUAL_REVIEW
            summary = "Test requires manual verification / engineer signoff."

        return TestResult(
            test_id=test_id,
            test_name=test_name,
            clause=clause,
            applicability=app_status,
            applicability_reason=app_reason,
            status=final_status,
            manual_result=manual_result,
            observations=observations,
            validations=validations,
            mpe_details=mpe_details,
            calculations=calculations,
            rule_trace=rule_trace,
            summary_message=summary,
            calculated_at=datetime.utcnow().isoformat()
        )
