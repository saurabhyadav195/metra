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
        is_applicable = True

        for tag in app_tags:
            if tag == "all_instruments":
                continue
            elif tag == "instruments_with_tare":
                if not context.has_tare:
                    return (ApplicabilityStatus.NOT_APPLICABLE, "Instrument does not feature a tare device")
                reasons.append("Tare device present")
            elif tag == "electronic_instruments":
                if not context.is_electronic:
                    return (ApplicabilityStatus.NOT_APPLICABLE, "Non-electronic instrument")
                reasons.append("Electronic instrument")
            elif tag == "battery_powered_instruments":
                if context.power_source not in ("battery", "mains_and_battery"):
                    return (ApplicabilityStatus.NOT_APPLICABLE, "Instrument is not battery powered")
                reasons.append("Battery powered instrument")
            elif tag.startswith("class_"):
                target_cls = tag.replace("class_", "").upper()
                if context.accuracy_class.upper() != target_cls:
                    return (ApplicabilityStatus.NOT_APPLICABLE, f"Test is restricted to Class {target_cls}")
                reasons.append(f"Class {target_cls} instrument")
            elif tag == "multi_interval":
                if context.instrument_type != "multi_interval" and not context.multi_range:
                    return (ApplicabilityStatus.NOT_APPLICABLE, "Instrument is single interval")
                reasons.append("Multi-interval / multi-range instrument")
            elif tag == "non_self_indicating":
                if context.instrument_type != "non_self_indicating":
                    return (ApplicabilityStatus.NOT_APPLICABLE, "Instrument is self-indicating")
                reasons.append("Non-self-indicating instrument")
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
                    # Unknown tag fallback to APPLICABLE with warning
                    reasons.append(f"Applicability tag '{tag}' accepted")

        reason_text = "; ".join(reasons) if reasons else "Applicable based on specification"
        return (ApplicabilityStatus.APPLICABLE, reason_text)
