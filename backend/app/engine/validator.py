"""
METRA — app/engine/validator.py
Validates observation inputs and instrument parameters against OIML R-76 metrological rules.
"""

from typing import List, Dict, Any, Optional
from app.engine.models import EvaluationContext, ValidationResult
from app.engine.rule_loader import get_rule_loader


class InputValidator:
    def __init__(self):
        self.loader = get_rule_loader()

    def validate_instrument_context(self, context: EvaluationContext) -> List[ValidationResult]:
        """Validates fundamental instrument specification parameters against OIML R-76 Table 3 rules."""
        results: List[ValidationResult] = []

        # 1. Non-zero positive checks
        if context.max_capacity <= 0:
            results.append(ValidationResult(
                rule_id="VAL_MAX_POSITIVE",
                param_name="max_capacity",
                status="FAIL",
                message="Max capacity must be strictly positive (> 0)."
            ))
        if context.e_resolution <= 0:
            results.append(ValidationResult(
                rule_id="VAL_E_POSITIVE",
                param_name="e_resolution",
                status="FAIL",
                message="Verification scale interval (e) must be strictly positive (> 0)."
            ))
        if context.d_resolution <= 0:
            results.append(ValidationResult(
                rule_id="VAL_D_POSITIVE",
                param_name="d_resolution",
                status="FAIL",
                message="Actual scale interval (d) must be strictly positive (> 0)."
            ))

        # 2. Relation between d and e (OIML 3.4.2: d <= e <= 10d)
        if context.d_resolution > 0 and context.e_resolution > 0:
            if context.d_resolution > context.e_resolution:
                results.append(ValidationResult(
                    rule_id="VAL_ACTUAL_VS_VERIFICATION_INTERVAL",
                    param_name="d_resolution",
                    status="FAIL",
                    message=f"Actual scale interval d ({context.d_resolution}) cannot be greater than e ({context.e_resolution})."
                ))
            elif context.e_resolution > (10 * context.d_resolution):
                results.append(ValidationResult(
                    rule_id="VAL_ACTUAL_VS_VERIFICATION_INTERVAL",
                    param_name="e_resolution",
                    status="WARNING",
                    message=f"Verification scale interval e ({context.e_resolution}) exceeds 10 * d ({context.d_resolution})."
                ))

        # 3. Check number of scale intervals n = Max / e
        if context.max_capacity > 0 and context.e_resolution > 0:
            n = context.max_capacity / context.e_resolution
            accuracy_class = context.accuracy_class.upper()
            
            # Check Table 3 limits
            if accuracy_class == "I" and n < 50000:
                results.append(ValidationResult(
                    rule_id="VAL_CLASSIFICATION_TABLE_3",
                    param_name="max_capacity",
                    status="WARNING",
                    message=f"Class I instruments typically require n >= 50,000 (calculated n = {n:.0f})."
                ))
            elif accuracy_class == "II" and (n < 100 or n > 100000):
                results.append(ValidationResult(
                    rule_id="VAL_CLASSIFICATION_TABLE_3",
                    param_name="max_capacity",
                    status="WARNING",
                    message=f"Class II instruments require 100 <= n <= 100,000 (calculated n = {n:.0f})."
                ))
            elif accuracy_class == "III" and (n < 100 or n > 10000):
                results.append(ValidationResult(
                    rule_id="VAL_CLASSIFICATION_TABLE_3",
                    param_name="max_capacity",
                    status="FAIL" if (n < 100 or n > 10000) else "PASS",
                    message=f"Class III instruments require 100 <= n <= 10,000 (calculated n = {n:.0f})."
                ))
            elif accuracy_class == "IIII" and (n < 100 or n > 1000):
                results.append(ValidationResult(
                    rule_id="VAL_CLASSIFICATION_TABLE_3",
                    param_name="max_capacity",
                    status="FAIL",
                    message=f"Class IIII instruments require 100 <= n <= 1,000 (calculated n = {n:.0f})."
                ))

        return results

    def validate_test_observations(
        self,
        test: Dict[str, Any],
        observations: Dict[str, Any],
        context: Optional[EvaluationContext] = None
    ) -> List[ValidationResult]:
        """Validates observations and instrument context against test required_inputs schema."""
        results: List[ValidationResult] = []
        required_inputs = test.get("required_inputs", [])

        # Build merged inputs: instrument context parameters + observation entries
        merged_inputs: Dict[str, Any] = {}
        if context:
            merged_inputs.update({
                "Max": context.max_capacity,
                "max_capacity": context.max_capacity,
                "Min": context.min_capacity,
                "min_capacity": context.min_capacity,
                "e": context.e_resolution,
                "d": context.d_resolution,
                "accuracy_class": context.accuracy_class,
                "unit": context.unit,
                "has_tare": context.has_tare,
                "is_electronic": context.is_electronic,
            })
        if observations:
            merged_inputs.update(observations)

        for req in required_inputs:
            param_name = req.get("name")
            param_type = req.get("type", "number")

            if param_name not in merged_inputs or merged_inputs[param_name] is None:
                # Check if optional or missing
                if req.get("optional") is True or req.get("default") is not None:
                    continue
                results.append(ValidationResult(
                    rule_id="VAL_REQUIRED_INPUT_MISSING",
                    param_name=param_name,
                    status="FAIL",
                    message=f"Missing required parameter '{param_name}' for test {test.get('test_id')}."
                ))
                continue

            val = merged_inputs[param_name]

            # Type checking
            if param_type == "number" and not isinstance(val, (int, float)):
                try:
                    float(val)
                except (ValueError, TypeError):
                    results.append(ValidationResult(
                        rule_id="VAL_INVALID_TYPE",
                        param_name=param_name,
                        status="FAIL",
                        message=f"Parameter '{param_name}' must be a number, got '{val}'."
                    ))

            # Allowed values enum check
            allowed = req.get("allowed_values")
            if allowed and val not in allowed:
                results.append(ValidationResult(
                    rule_id="VAL_ALLOWED_VALUES",
                    param_name=param_name,
                    status="FAIL",
                    message=f"Parameter '{param_name}' value '{val}' not in allowed values: {allowed}."
                ))

        return results
