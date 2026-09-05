"""
METRA — app/engine/calculator.py
Calculation engine that executes OIML calculation rules against test observations and context.
"""

from typing import Dict, Any, List, Optional
from app.engine.models import EvaluationContext, CalculationResult, MPEResult
from app.engine.formula_parser import evaluate_expression
from app.engine.rule_loader import get_rule_loader
from app.engine.mpe_engine import MPEEngine


class CalculationEngine:
    def __init__(self):
        self.loader = get_rule_loader()
        self.mpe_engine = MPEEngine()

    def calculate_rule(
        self,
        rule_id: str,
        observations: Dict[str, Any],
        context: EvaluationContext,
        mpe_result: Optional[MPEResult] = None
    ) -> List[CalculationResult]:
        """
        Executes a calculation rule by ID using observations and context variables.
        """
        rule = self.loader.get_calculation_rule(rule_id)
        if not rule:
            # Fallback for dynamic/test-specific calculation IDs
            return []

        calc_name = rule.get("name", rule_id)
        formula_expr = rule.get("formula_expression", "")
        source = rule.get("source", {})

        # Prepare variable environment
        env: Dict[str, Any] = {
            "Max": context.max_capacity,
            "Min": context.min_capacity,
            "e": context.e_resolution,
            "d": context.d_resolution,
            "accuracy_class": context.accuracy_class,
            "unit": context.unit,
        }
        # Inject observations
        env.update(observations)

        # Derive array stats if present
        readings = observations.get("readings") or observations.get("repeatability_readings") or observations.get("indications")
        if isinstance(readings, list) and len(readings) > 0:
            env.setdefault("I_max", max(readings))
            env.setdefault("I_min", min(readings))
            env.setdefault("readings", readings)

        # Handle MPE in env
        if mpe_result:
            env["mpe"] = mpe_result.mpe_value
            env["mpe_e"] = mpe_result.mpe_e

        results: List[CalculationResult] = []

        # Check if formula contains multiple statements separated by semicolon (e.g. P = ...; E = ...)
        if ";" in formula_expr:
            statements = [stmt.strip() for stmt in formula_expr.split(";") if stmt.strip()]
            sub_outputs = {}
            for stmt in statements:
                if "=" in stmt:
                    var_name, expr = stmt.split("=", 1)
                    var_name = var_name.strip()
                    val = evaluate_expression(expr.strip(), env)
                    env[var_name] = val
                    sub_outputs[var_name] = val

            # Primary output evaluation
            for symbol, val in sub_outputs.items():
                decision = None
                if mpe_result and symbol in ("E", "Ec"):
                    decision = "PASS" if abs(val) <= mpe_result.mpe_value else "FAIL"

                results.append(CalculationResult(
                    calculation_id=f"{rule_id}_{symbol}",
                    name=f"{calc_name} ({symbol})",
                    formula=formula_expr,
                    inputs={k: v for k, v in env.items() if k in ("I", "L", "e", "dL", "E0", "Max", "Min")},
                    output=val,
                    unit=context.unit,
                    decision=decision,
                    limit=mpe_result.mpe_value if mpe_result else None,
                    source=source
                ))

        else:
            # Single expression formula
            val = evaluate_expression(formula_expr, env)
            
            # Determine decision if comparing error against MPE
            decision = None
            if mpe_result:
                if isinstance(val, (int, float)):
                    decision = "PASS" if abs(val) <= mpe_result.mpe_value else "FAIL"

            results.append(CalculationResult(
                calculation_id=rule_id,
                name=calc_name,
                formula=formula_expr,
                inputs={k: v for k, v in env.items() if k in ("I", "L", "e", "dL", "E0", "Max", "Min", "repeatability_readings", "errors")},
                output=val,
                unit=context.unit,
                decision=decision,
                limit=mpe_result.mpe_value if mpe_result else None,
                source=source
            ))

        return results
