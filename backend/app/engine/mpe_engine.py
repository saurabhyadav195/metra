"""
METRA — app/engine/mpe_engine.py
Engine for evaluating OIML R-76 Maximum Permissible Error (MPE) for given loads and accuracy classes.
Supports single-interval and multi-interval / multi-range instruments (OIML T.3.2.6 / T.3.2.7).
"""

from typing import Dict, Any, Optional, List
from app.engine.models import MPEResult, WeighingInterval
from app.engine.rule_loader import get_rule_loader


class MPEEngine:
    def __init__(self):
        self.loader = get_rule_loader()

    @staticmethod
    def _resolve_active_e(
        load: float,
        intervals: Optional[List[WeighingInterval]],
        fallback_e: float
    ) -> float:
        """
        Resolves the active verification scale interval e_i for a given load.

        For multi-interval instruments (OIML T.3.2.6) the range is divided into
        partial weighing ranges each with a different e_i.  The correct e to use
        for Table 6 lookup is the e of the partial range that *contains* the load.

        Intervals must be ordered ascending by max_load.  The first interval whose
        max_load >= load is selected.  If no interval covers the load (i.e. the load
        exceeds the last interval's max_load) the last interval's e is used.

        Falls back to fallback_e if intervals is None or empty.
        """
        if not intervals:
            return fallback_e

        # Walk ascending — return e of first interval that covers the load
        for interval in sorted(intervals, key=lambda iv: iv.max_load):
            if load <= interval.max_load:
                return interval.e

        # Load exceeds all declared interval bounds — use the largest interval's e
        return sorted(intervals, key=lambda iv: iv.max_load)[-1].e

    def get_mpe_initial_e(self, accuracy_class: str, load_e_ratio: float) -> float:
        """
        Looks up MPE in terms of e for initial verification based on OIML R-76 Table 6,
        dynamically loading limits from mpe_rules.json (rule_id: "MPE_INIT").
        """
        cls = accuracy_class.upper()
        load = abs(load_e_ratio)

        rule = self.loader.get_mpe_rule("MPE_INIT")
        if rule and "classes" in rule:
            class_ranges = rule["classes"].get(cls, [])
            for item in class_ranges:
                max_load_raw = item.get("max_load_e")
                if max_load_raw == "infinity" or str(max_load_raw).lower() == "infinity":
                    max_load = float("inf")
                else:
                    try:
                        max_load = float(max_load_raw)
                    except (ValueError, TypeError):
                        max_load = float("inf")

                min_load = float(item.get("min_load_e", 0))

                if load <= max_load:
                    return float(item.get("mpe_e", 1.0))

            if class_ranges:
                return float(class_ranges[-1].get("mpe_e", 1.5))

        # Static fallback if rule data unavailable
        return 1.0

    def calculate_zero_setting_accuracy_mpe(
        self,
        context: Any
    ) -> MPEResult:
        """
        Calculates MPE specifically for Zero-Setting Accuracy test (TEST-A.4.2.3 / OIML R 76-1 §4.5.2).
        Limit is ±0.25 * e1 (using smallest verification scale interval e1 for multi-interval instruments).
        """
        e1 = getattr(context, "e1_resolution", None) or getattr(context, "e_resolution", 1.0)
        mpe_e = 0.25
        mpe_value = 0.25 * e1

        return MPEResult(
            rule_id="ZERO_SETTING_ACCURACY",
            load=0.0,
            load_e_ratio=0.0,
            mpe_e=mpe_e,
            mpe_value=mpe_value,
            unit=getattr(context, "unit", "kg"),
            verification_type=getattr(context, "verification_type", "initial"),
            source={
                "standard": "OIML R 76-1",
                "edition": "2006 (E)",
                "section": "4.5.2 & A.4.2.3",
                "page": 48,
                "active_e": e1,
                "rule_name": "Zero-Setting Accuracy Limit (±0.25 e1)"
            }
        )

    def calculate_mpe(
        self,
        accuracy_class: str,
        load: float,
        e_resolution: float,
        unit: str = "kg",
        verification_type: str = "initial",
        intervals: Optional[List[WeighingInterval]] = None,
        rule_id: Optional[str] = None,
        e1_resolution: Optional[float] = None
    ) -> MPEResult:
        """
        Calculates MPE value in engineering units (e.g. kg) and in e.
        Dynamically fetches rule parameters from mpe_rules.json definitions via RuleLoader.
        """
        target_rule_id = rule_id or ("MPE_SERVICE" if verification_type == "service" else "MPE_INIT")

        if target_rule_id == "ZERO_SETTING_ACCURACY":
            e1 = e1_resolution or e_resolution
            mpe_e = 0.25
            mpe_value = 0.25 * e1
            return MPEResult(
                rule_id="ZERO_SETTING_ACCURACY",
                load=load,
                load_e_ratio=load / e1 if e1 > 0 else 0.0,
                mpe_e=mpe_e,
                mpe_value=mpe_value,
                unit=unit,
                verification_type=verification_type,
                source={
                    "standard": "OIML R 76-1",
                    "edition": "2006 (E)",
                    "section": "4.5.2 & A.4.2.3",
                    "page": 48,
                    "active_e": e1
                }
            )

        if e_resolution <= 0:
            e_resolution = 1.0

        # Resolve the active e for this load (multi-interval aware)
        active_e = self._resolve_active_e(load, intervals, e_resolution)

        load_e_ratio = abs(load) / active_e
        mpe_e = self.get_mpe_initial_e(accuracy_class, load_e_ratio)

        rule_def = self.loader.get_mpe_rule(target_rule_id) or self.loader.get_mpe_rule("MPE_INIT")
        source = rule_def.get("source", {}) if rule_def else {}

        source_section = source.get("section", "3.5.1")
        source_table = source.get("table", "Table 6")

        if verification_type == "service" or target_rule_id == "MPE_SERVICE":
            mpe_e = mpe_e * 2.0
            target_rule_id = "MPE_SERVICE"
            source_section = "3.5.2"

        mpe_value = mpe_e * active_e

        return MPEResult(
            rule_id=target_rule_id,
            load=load,
            load_e_ratio=load_e_ratio,
            mpe_e=mpe_e,
            mpe_value=mpe_value,
            unit=unit,
            verification_type=verification_type,
            source={
                "standard": source.get("standard", "OIML R 76-1"),
                "edition": source.get("edition", "2006 (E)"),
                "section": source_section,
                "table": source_table,
                "page": source.get("page", 30),
                "active_e": active_e,
                "multi_interval": intervals is not None and len(intervals) > 1
            }
        )


