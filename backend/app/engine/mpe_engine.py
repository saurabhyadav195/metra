"""
METRA — app/engine/mpe_engine.py
Engine for evaluating OIML R-76 Maximum Permissible Error (MPE) for given loads and accuracy classes.
"""

from typing import Dict, Any, Optional
from app.engine.models import MPEResult
from app.engine.rule_loader import get_rule_loader


class MPEEngine:
    def __init__(self):
        self.loader = get_rule_loader()

    def get_mpe_initial_e(self, accuracy_class: str, load_e_ratio: float) -> float:
        """
        Looks up MPE in terms of e for initial verification based on OIML R-76 Table 6.
        """
        cls = accuracy_class.upper()
        load = abs(load_e_ratio)

        if cls == "I":
            if load <= 50000:
                return 0.5
            elif load <= 200000:
                return 1.0
            else:
                return 1.5

        elif cls == "II":
            if load <= 5000:
                return 0.5
            elif load <= 20000:
                return 1.0
            else:
                return 1.5

        elif cls == "III":
            if load <= 500:
                return 0.5
            elif load <= 2000:
                return 1.0
            else:
                return 1.5

        elif cls == "IIII":
            if load <= 50:
                return 0.5
            elif load <= 200:
                return 1.0
            else:
                return 1.5

        # Default fallback if unknown class
        return 1.0

    def calculate_mpe(
        self,
        accuracy_class: str,
        load: float,
        e_resolution: float,
        unit: str = "kg",
        verification_type: str = "initial"
    ) -> MPEResult:
        """
        Calculates MPE value in engineering units (e.g. kg) and in e.
        """
        if e_resolution <= 0:
            e_resolution = 1.0

        load_e_ratio = abs(load) / e_resolution
        mpe_e = self.get_mpe_initial_e(accuracy_class, load_e_ratio)

        rule_id = "MPE_INIT"
        source_section = "3.5.1"
        source_table = "Table 6"

        if verification_type == "service":
            mpe_e = mpe_e * 2.0
            rule_id = "MPE_SERVICE"
            source_section = "3.5.2"

        mpe_value = mpe_e * e_resolution

        return MPEResult(
            rule_id=rule_id,
            load=load,
            load_e_ratio=load_e_ratio,
            mpe_e=mpe_e,
            mpe_value=mpe_value,
            unit=unit,
            verification_type=verification_type,
            source={
                "standard": "OIML R 76-1",
                "edition": "2006 (E)",
                "section": source_section,
                "table": source_table,
                "page": 30
            }
        )
