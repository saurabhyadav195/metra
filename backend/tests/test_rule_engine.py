"""
METRA — tests/test_rule_engine.py
Unit tests for the OIML R-76 evaluation engine components.
Pure Python test functions (no external framework required).
"""

from app.engine.rule_loader import RuleLoader, get_rule_loader
from app.engine.models import EvaluationContext, ApplicabilityStatus, TestExecutionStatus
from app.engine.formula_parser import evaluate_expression, FormulaEvaluationError
from app.engine.applicability import ApplicabilityEngine
from app.engine.mpe_engine import MPEEngine
from app.engine.validator import InputValidator
from app.engine.evaluator import RuleEvaluator


def test_rule_loader():
    loader = get_rule_loader()
    all_tests = loader.get_all_tests()
    assert len(all_tests) > 0, "Should load OIML tests"
    assert loader.get_mpe_rule("MPE_INIT") is not None, "MPE_INIT rule should exist"


def test_formula_parser():
    # Simple arithmetic
    assert evaluate_expression("10 + 20 * 2", {}) == 50
    # Abs and math functions
    assert evaluate_expression("abs(-5.5)", {}) == 5.5
    # Variables substitution
    val = evaluate_expression("P - L", {"P": 100.02, "L": 100.00})
    assert abs(val - 0.02) < 1e-5, f"Expected 0.02, got {val}"
    # Comparison
    assert evaluate_expression("E <= mpe", {"E": 0.05, "mpe": 0.10}) is True

    # Security restriction check
    caught = False
    try:
        evaluate_expression("__import__('os').system('dir')", {})
    except FormulaEvaluationError:
        caught = True
    assert caught, "Should reject disallowed import in formula parser"


def test_applicability_engine():
    app_engine = ApplicabilityEngine()

    ctx_tare = EvaluationContext(
        instrument_id="inst_1",
        max_capacity=150.0,
        e_resolution=0.05,
        d_resolution=0.05,
        accuracy_class="III",
        has_tare=True,
        is_electronic=True
    )

    ctx_no_tare = EvaluationContext(
        instrument_id="inst_2",
        max_capacity=100.0,
        e_resolution=0.02,
        d_resolution=0.02,
        accuracy_class="III",
        has_tare=False,
        is_electronic=True
    )

    test_tare = {
        "test_id": "TEST-TARE-1",
        "applicability": ["instruments_with_tare"]
    }

    status_tare, _ = app_engine.evaluate_test_applicability(test_tare, ctx_tare)
    assert status_tare == ApplicabilityStatus.APPLICABLE

    status_no_tare, _ = app_engine.evaluate_test_applicability(test_tare, ctx_no_tare)
    assert status_no_tare == ApplicabilityStatus.NOT_APPLICABLE


def test_mpe_engine():
    mpe_engine = MPEEngine()

    # Class III, Load = 100 kg, e = 0.05 kg -> Load/e = 2000 e -> MPE = 1.0 e = 0.05 kg
    res_initial = mpe_engine.calculate_mpe("III", 100.0, 0.05, "kg", "initial")
    assert res_initial.mpe_e == 1.0
    assert abs(res_initial.mpe_value - 0.05) < 1e-5

    # Class III, Load = 300 kg, e = 0.05 kg -> Load/e = 6000 e -> MPE = 1.5 e = 0.075 kg
    res_higher = mpe_engine.calculate_mpe("III", 300.0, 0.05, "kg", "initial")
    assert res_higher.mpe_e == 1.5
    assert abs(res_higher.mpe_value - 0.075) < 1e-5

    # Service verification multiplier check (x2)
    res_service = mpe_engine.calculate_mpe("III", 100.0, 0.05, "kg", "service")
    assert res_service.mpe_e == 2.0
    assert abs(res_service.mpe_value - 0.10) < 1e-5


def test_input_validator():
    validator = InputValidator()
    ctx_invalid = EvaluationContext(
        instrument_id="inst_err",
        max_capacity=-10.0,
        e_resolution=0.05,
        d_resolution=0.10,  # d > e violates d <= e
        accuracy_class="III"
    )

    results = validator.validate_instrument_context(ctx_invalid)
    fails = [r for r in results if r.status == "FAIL"]
    assert len(fails) >= 2


def test_rule_evaluator_pass():
    evaluator = RuleEvaluator()
    ctx = EvaluationContext(
        instrument_id="inst_test",
        max_capacity=100.0,
        e_resolution=0.05,
        d_resolution=0.05,
        accuracy_class="III"
    )

    # TEST-A.4.10 is Repeatability test
    test_id = "TEST-A.4.10"
    observations = {
        "test_load": 50.0,
        "repeatability_readings": [50.00, 50.01, 50.00, 50.01, 50.00]
    }

    res = evaluator.evaluate_test(test_id, ctx, observations)
    assert res.applicability == ApplicabilityStatus.APPLICABLE
    assert res.status in (TestExecutionStatus.PASS, TestExecutionStatus.MANUAL_REVIEW, TestExecutionStatus.IN_PROGRESS), f"Got status {res.status}: {res.summary_message}"
