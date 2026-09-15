"""
METRA — app/engine/applicability.py
Evaluates whether OIML R-76 tests apply to a specific instrument context.
"""

from typing import List, Dict, Any, Tuple
from app.engine.models import EvaluationContext, ApplicabilityStatus
from app.engine.rule_loader import get_rule_loader


class ApplicabilityEngine:
    def __init__(self):
        self.loader = get_rule_loader()

    def evaluate_condition(self, condition: Dict[str, Any], context: EvaluationContext) -> bool:
        """Evaluates a single condition dictionary against an EvaluationContext."""
        field = condition.get("field")
        operator = condition.get("operator")
        target_value = condition.get("value")

        if not hasattr(context, field):
            # Check context extra dict if applicable
            return False

        ctx_val = getattr(context, field)

        if operator == "==":
            return ctx_val == target_value
        elif operator == "!=":
            return ctx_val != target_value
        elif operator == "in":
            return ctx_val in target_value if isinstance(target_value, list) else False
        elif operator == "not_in":
            return ctx_val not in target_value if isinstance(target_value, list) else True
        elif operator == "<=":
            return ctx_val <= target_value
        elif operator == ">=":
            return ctx_val >= target_value
        elif operator == "<":
            return ctx_val < target_value
        elif operator == ">":
            return ctx_val > target_value
        elif operator == "contains":
            return target_value in ctx_val if isinstance(ctx_val, (list, str)) else False
        return False

    def evaluate_test_applicability(self, test: Dict[str, Any], context: EvaluationContext) -> Tuple[ApplicabilityStatus, str]:
        """
        Determines applicability of a test based on its applicability tags and OIML rule definitions.
        Returns (ApplicabilityStatus, reason_string).
        """
        app_tags = test.get("applicability", [])
        if not app_tags or "all_instruments" in app_tags:
            return (ApplicabilityStatus.APPLICABLE, "Applies to all instruments")

        reasons = []
        valid_class_symbols = {"I", "II", "III", "IIII"}

        # 1. PRE-CHECK: Handle accuracy class logic (supports "class_III" and "III" formats)
        allowed_classes = []
        for tag in app_tags:
            if tag.startswith("class_"):
                allowed_classes.append(tag.replace("class_", "").upper())
            elif tag.upper() in valid_class_symbols:
                allowed_classes.append(tag.upper())

        if allowed_classes:
            if context.accuracy_class.upper() not in allowed_classes:
                return (ApplicabilityStatus.NOT_APPLICABLE, f"Test is restricted to Class(es) {', '.join(allowed_classes)}")
            reasons.append(f"Class {context.accuracy_class.upper()} instrument matches class requirements")

        # 2. MAIN LOOP: Process the remaining non-class tags
        for tag in app_tags:
            if tag == "all_instruments" or tag.startswith("class_") or tag.upper() in valid_class_symbols:
                continue  # Already handled in Pre-Check
            elif tag == "instruments_with_tare":
                if not context.has_tare:
                    return (ApplicabilityStatus.NOT_APPLICABLE, "Instrument does not feature a tare device")
                reasons.append("Tare device present")
            elif tag in ("electronic_instruments", "electronic_instruments_with_cables"):
                if not context.is_electronic:
                    return (ApplicabilityStatus.NOT_APPLICABLE, "Non-electronic instrument")
                reasons.append("Electronic instrument")
            elif tag == "ac_mains_electronic_instruments":
                if not context.is_electronic or getattr(context, 'power_source', 'mains') == "battery":
                    return (ApplicabilityStatus.NOT_APPLICABLE, "Not an AC mains electronic instrument")
                reasons.append("AC mains electronic instrument")
            elif tag == "battery_powered_instruments":
                if getattr(context, 'power_source', '') not in ("battery", "mains_and_battery"):
                    return (ApplicabilityStatus.NOT_APPLICABLE, "Instrument is not battery powered")
                reasons.append("Battery powered instrument")
            elif tag == "multi_interval":
                if getattr(context, 'instrument_type', '') != "multi_interval" and not getattr(context, 'multi_range', False):
                    return (ApplicabilityStatus.NOT_APPLICABLE, "Instrument is single interval")
                reasons.append("Multi-interval / multi-range instrument")
            elif tag in ("non_self_indicating", "non_self_indicating_instruments"):
                if getattr(context, 'instrument_type', '') != "non_self_indicating":
                    return (ApplicabilityStatus.NOT_APPLICABLE, "Instrument is self-indicating")
                reasons.append("Non-self-indicating instrument")
            elif tag == "digital_instruments_d_ge_5mg":
                if getattr(context, 'd_resolution', 0) < 0.005:
                    return (ApplicabilityStatus.NOT_APPLICABLE, "d is less than 5 mg")
                reasons.append("Digital instrument with d >= 5mg")
            elif tag == "Max_le_100kg":
                if getattr(context, 'max_capacity', 0) > 100:
                    return (ApplicabilityStatus.NOT_APPLICABLE, "Max capacity exceeds 100 kg")
                reasons.append("Max capacity <= 100 kg")
            elif tag == "indicators_with_6_wire":
                return (ApplicabilityStatus.NOT_APPLICABLE, "Not a 6-wire module test")
            elif tag == "instruments_liable_to_be_tilted":
                reasons.append("Instrument liable to be tilted")
            elif tag in ("printers", "data_storage"):
                reasons.append(f"Applicable for {tag}")
            elif tag.startswith("electronic_instruments_except_class_I"):
                if getattr(context, 'accuracy_class', '').upper() == "I":
                    return (ApplicabilityStatus.NOT_APPLICABLE, "Exempt for Class I instruments")
                reasons.append("Electronic instrument (Not Class I)")
            elif tag == "module_testing":
                return (ApplicabilityStatus.MANUAL_REVIEW, "Module-level testing requires manual review")
            else:
                # Check rule loader applicability rules if tag matches a rule_id
                rule = self.loader.get_applicability_rule(tag)
                if rule:
                    conds = rule.get("conditions", [])
                    rule_passed = all(self.evaluate_condition(c, context) for c in conds)
                    if not rule_passed:
                        return (ApplicabilityStatus.NOT_APPLICABLE, f"Condition {tag} not met: {rule.get('description')}")
                    reasons.append(rule.get('description', tag))
                else:
                    return (ApplicabilityStatus.NOT_APPLICABLE, f"Unrecognized tag in JSON: '{tag}'")

        reason_text = "; ".join(reasons) if reasons else "Applicable based on specification"
        return (ApplicabilityStatus.APPLICABLE, reason_text)