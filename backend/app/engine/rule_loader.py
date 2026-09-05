"""
METRA — app/engine/rule_loader.py
Loader and registry for OIML R-76 JSON rule definitions.
Loads, validates, and indexes rule files at startup.
"""

import json
import re
from pathlib import Path
from typing import Dict, List, Any, Optional

# Path to rules directory relative to backend root
RULES_DIR = Path(__file__).resolve().parent.parent.parent.parent / "rules" / "oiml-r76"


class RuleLoader:
    _instance: Optional['RuleLoader'] = None

    def __init__(self, rules_dir: Optional[Path] = None):
        self.rules_dir = rules_dir or RULES_DIR
        self.metadata: Dict[str, Any] = {}
        self.definitions: Dict[str, Any] = {}
        self.tests: Dict[str, Dict[str, Any]] = {}  # test_id -> test dict
        self.mpe_rules: Dict[str, Dict[str, Any]] = {}  # rule_id -> mpe dict
        self.calculation_rules: Dict[str, Dict[str, Any]] = {}  # calc_id -> calc dict
        self.validation_rules: Dict[str, Dict[str, Any]] = {}  # rule_id -> val dict
        self.applicability_rules: Dict[str, Dict[str, Any]] = {}  # rule_id -> app dict

        self._load_all()

    @classmethod
    def get_instance(cls) -> 'RuleLoader':
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _sanitize_mpe_json(self, raw_text: str) -> str:
        """Fixes raw mpe_rules.json syntax errors (missing commas, corrupt trailing bytes)."""
        # Fix missing comma between rule objects, e.g. } \n {
        text = re.sub(r'\}\s*\n\s*\{', '},\n{', raw_text)
        
        # Truncate at the true closing of the array / object if trailing corruption exists
        # Look for last valid array closing `]`
        last_bracket_idx = text.rfind(']')
        if last_bracket_idx != -1:
            text = text[:last_bracket_idx + 1] + "\n}"
        return text

    def _load_all(self):
        if not self.rules_dir.exists():
            raise RuntimeError(f"Rules directory not found at {self.rules_dir}")

        # 1. Metadata
        meta_file = self.rules_dir / "metadata.json"
        if meta_file.exists():
            with open(meta_file, "r", encoding="utf-8") as f:
                self.metadata = json.load(f)

        # 2. Definitions
        def_file = self.rules_dir / "definitions.json"
        if def_file.exists():
            with open(def_file, "r", encoding="utf-8") as f:
                self.definitions = json.load(f)

        # 3. Tests
        tests_file = self.rules_dir / "tests.json"
        if tests_file.exists():
            with open(tests_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                tests_list = data.get("tests", [])
                for t in tests_list:
                    self.tests[t["test_id"]] = t

        # 4. MPE Rules
        mpe_file = self.rules_dir / "mpe_rules.json"
        if mpe_file.exists():
            with open(mpe_file, "r", encoding="utf-8") as f:
                raw = f.read()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                sanitized = self._sanitize_mpe_json(raw)
                data = json.loads(sanitized)

            mpe_list = data.get("mpe_rules", [])
            for m in mpe_list:
                # Deduplicate gracefully
                if m.get("rule_id") and m["rule_id"] not in self.mpe_rules:
                    self.mpe_rules[m["rule_id"]] = m

        # 5. Calculation Rules
        calc_file = self.rules_dir / "calculation_rules.json"
        if calc_file.exists():
            with open(calc_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                calc_list = data.get("calculation_rules", [])
                for c in calc_list:
                    calc_id = c.get("calculation_id") or c.get("rule_id")
                    if calc_id:
                        self.calculation_rules[calc_id] = c

        # 6. Validation Rules
        val_file = self.rules_dir / "validation_rules.json"
        if val_file.exists():
            with open(val_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                val_list = data.get("validation_rules", [])
                for v in val_list:
                    self.validation_rules[v["rule_id"]] = v

        # 7. Applicability Rules
        app_file = self.rules_dir / "applicability_rules.json"
        if app_file.exists():
            with open(app_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                app_list = data.get("applicability_rules", [])
                for a in app_list:
                    self.applicability_rules[a["rule_id"]] = a

    # Query helper methods
    def get_test(self, test_id: str) -> Optional[Dict[str, Any]]:
        return self.tests.get(test_id)

    def get_all_tests(self) -> List[Dict[str, Any]]:
        return list(self.tests.values())

    def get_mpe_rule(self, rule_id: str) -> Optional[Dict[str, Any]]:
        return self.mpe_rules.get(rule_id)

    def get_calculation_rule(self, calculation_id: str) -> Optional[Dict[str, Any]]:
        return self.calculation_rules.get(calculation_id)

    def get_validation_rule(self, rule_id: str) -> Optional[Dict[str, Any]]:
        return self.validation_rules.get(rule_id)

    def get_applicability_rule(self, rule_id: str) -> Optional[Dict[str, Any]]:
        return self.applicability_rules.get(rule_id)


def get_rule_loader() -> RuleLoader:
    return RuleLoader.get_instance()
