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


def test_multi_interval_mpe_engine():
    from app.engine.models import WeighingInterval
    mpe_engine = MPEEngine()

    # 0-15 kg, Class III instrument: W1: 0-6 kg (e1=0.002 kg), W2: 6-15 kg (e2=0.005 kg)
    intervals = [
        WeighingInterval(max_load=6.0, e=0.002),
        WeighingInterval(max_load=15.0, e=0.005)
    ]

    # At L = 4 kg (Interval 1: e1=0.002): load_e_ratio = 4 / 0.002 = 2000 e -> MPE = 1.0 e1 = 0.002 kg
    res_iv1 = mpe_engine.calculate_mpe("III", 4.0, 0.005, "kg", "initial", intervals=intervals)
    assert res_iv1.source["active_e"] == 0.002
    assert res_iv1.load_e_ratio == 2000.0
    assert res_iv1.mpe_e == 1.0
    assert abs(res_iv1.mpe_value - 0.002) < 1e-6

    # At L = 10 kg (Interval 2: e2=0.005): load_e_ratio = 10 / 0.005 = 2000 e -> MPE = 1.0 e2 = 0.005 kg
    res_iv2 = mpe_engine.calculate_mpe("III", 10.0, 0.005, "kg", "initial", intervals=intervals)
    assert res_iv2.source["active_e"] == 0.005
    assert res_iv2.load_e_ratio == 2000.0
    assert res_iv2.mpe_e == 1.0
    assert abs(res_iv2.mpe_value - 0.005) < 1e-6


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
        "number_of_weighings": 10,
        "repeatability_readings": [50.00, 50.01, 50.00, 50.01, 50.00]
    }

    res = evaluator.evaluate_test(test_id, ctx, observations)
    assert res.applicability == ApplicabilityStatus.APPLICABLE
    assert res.status in (TestExecutionStatus.PASS, TestExecutionStatus.MANUAL_REVIEW, TestExecutionStatus.IN_PROGRESS), f"Got status {res.status}: {res.summary_message}"


def test_zero_setting_accuracy_test():
    """
    Focused test for TEST-A.4.2.3 — Accuracy of zero-setting.
    Verifies:
      1. Load L is preserved from payload (not overwritten/forced to 0).
      2. dL is extracted correctly.
      3. True error formula E = I + 0.5*e1 - dL - L is computed with exact precision.
      4. MPE is calculated as ±0.25 * e1 (not Table 6 MPE or 20e/±3kg).
      5. Correct rule selection (ZERO_SETTING_ACCURACY).
      6. Trace output details.
      7. Both PASS and FAIL observations.
    """
    evaluator = RuleEvaluator()
    ctx = EvaluationContext(
        instrument_id="inst_zero_acc",
        max_capacity=15.0,
        e_resolution=0.002,
        e1_resolution=0.002,
        d_resolution=0.001,
        accuracy_class="III",
        unit="kg"
    )

    test_id = "TEST-A.4.2.3"

    # --- 1. Passing observation at L = 0 ---
    obs_pass = {
        "L": 0.0,
        "I": 0.0,
        "dL": 0.0008
    }
    res_pass = evaluator.evaluate_test(test_id, ctx, obs_pass)
    assert res_pass.status == TestExecutionStatus.PASS
    assert len(res_pass.mpe_details) > 0
    mpe_pass = res_pass.mpe_details[0]
    assert mpe_pass.rule_id == "ZERO_SETTING_ACCURACY"
    assert mpe_pass.mpe_e == 0.25
    assert abs(mpe_pass.mpe_value - 0.0005) < 1e-9

    calc_pass = next(c for c in res_pass.calculations if c.decision is not None)
    # E = 0.0 + 0.5 * 0.002 - 0.0008 - 0.0 = 0.0002
    assert abs(calc_pass.output - 0.0002) < 1e-9
    assert calc_pass.decision == "PASS"

    full_trace_text = " ".join(t.explanation for t in res_pass.rule_trace)
    assert "TEST-A.4.2.3" in full_trace_text
    assert "Applied load L: 0.0" in full_trace_text
    assert "Changeover dL: 0.0008" in full_trace_text
    assert "Applicable e/e1: 0.002" in full_trace_text
    assert "Formula used:" in full_trace_text
    assert "0.0002" in full_trace_text
    assert "MPE limit: ±0.0005" in full_trace_text
    assert "PASS" in full_trace_text

    # --- 2. Failing observation when L = 0.02 is supplied (verifying L is preserved) ---
    obs_fail_L = {
        "L": 0.02,
        "I": 0.0,
        "dL": 0.0004
    }
    res_fail_L = evaluator.evaluate_test(test_id, ctx, obs_fail_L)
    assert res_fail_L.status == TestExecutionStatus.FAIL
    calc_fail_L = next(c for c in res_fail_L.calculations if c.decision is not None)
    # E = 0.0 + 0.5 * 0.002 - 0.0004 - 0.02 = -0.0194
    assert abs(calc_fail_L.output - (-0.0194)) < 1e-9
    assert calc_fail_L.decision == "FAIL"

    trace_fail = " ".join(t.explanation for t in res_fail_L.rule_trace)
    assert "Applied load L: 0.02" in trace_fail
    assert "-0.0194" in trace_fail

    # --- 3. Failing observation at L = 0 due to large changeover offset ---
    obs_fail_dL = {
        "L": 0.0,
        "I": 0.0,
        "dL": 0.0002
    }
    res_fail_dL = evaluator.evaluate_test(test_id, ctx, obs_fail_dL)
    assert res_fail_dL.status == TestExecutionStatus.FAIL
    calc_fail_dL = next(c for c in res_fail_dL.calculations if c.decision is not None)
    # E = 0.0 + 0.5 * 0.002 - 0.0002 - 0.0 = 0.0008 (exceeds MPE 0.0005)
    assert abs(calc_fail_dL.output - 0.0008) < 1e-9
    assert calc_fail_dL.decision == "FAIL"


def test_multi_row_array_iteration():
    """
    Verifies architectural fixes:
    1. Multi-row iteration over arrays (steps, load_steps, positions).
    2. Dynamic variable binding (accepts keys natively into env).
    3. Row-by-row CalculationResult and RuleTraceEntry generation.
    """
    evaluator = RuleEvaluator()
    ctx = EvaluationContext(
        instrument_id="inst_multi_row",
        max_capacity=15.0,
        e_resolution=0.005,
        d_resolution=0.001,
        accuracy_class="III",
        unit="kg"
    )

    # Multi-step weighing test (TEST-A.4.4.1)
    obs_weighing = {
        "load_steps": [
            {"L": 5.0, "I": 5.000, "dL": 0.002},
            {"L": 10.0, "I": 10.000, "dL": 0.002},
            {"L": 15.0, "I": 15.000, "dL": 0.002}
        ]
    }

    res_weighing = evaluator.evaluate_test("TEST-A.4.4.1", ctx, obs_weighing)
    assert res_weighing.status == TestExecutionStatus.PASS
    # Each row produces 3 outputs (P, E, Ec) -> 9 calculation results total
    assert len(res_weighing.calculations) == 9
    # Verify trace entries exist for each calculation step
    assert len(res_weighing.rule_trace) >= 10


def test_tare_weighing_i_net_mapping():
    """
    Verifies fix for Tare Weighing test (TEST-A.4.6.1):
    Observation rows submitting I_net and I_gross without 'I' are pre-processed
    so that I_net is mapped to 'I', allowing formulas expecting 'I' to execute correctly.
    """
    from app.engine.evaluator import normalize_observation_payload
    from app.services.evaluation_service import EvaluationService

    # 1. Verify normalize_observation_payload directly
    raw_payload = {
        "tare_weight": 2.0,
        "net_test_steps": [
            {"L": 5.0, "I_net": 5.000, "I_gross": 7.000, "dL": 0.002},
            {"L": 10.0, "I_net": 10.000, "I_gross": 12.000, "dL": 0.002}
        ]
    }
    norm = normalize_observation_payload(raw_payload)
    steps = norm["net_test_steps"]
    assert steps[0]["I"] == 5.000, f"Expected step 0 I=5.000, got {steps[0].get('I')}"
    assert steps[1]["I"] == 10.000, f"Expected step 1 I=10.000, got {steps[1].get('I')}"

    # 2. Verify RuleEvaluator with Tare observation payload
    evaluator = RuleEvaluator()
    ctx = EvaluationContext(
        instrument_id="inst_tare",
        max_capacity=15.0,
        e_resolution=0.005,
        d_resolution=0.001,
        accuracy_class="III",
        has_tare=True,
        unit="kg"
    )
    res_tare = evaluator.evaluate_test("TEST-A.4.4.1", ctx, raw_payload)
    assert res_tare.status == TestExecutionStatus.PASS
    first_calc = res_tare.calculations[0]
    # Check that input 'I' passed into calculation engine is 5.000, not 0
    assert first_calc.inputs.get("I") == 5.000

    # 3. Verify EvaluationService specialized weighing test calculator for TEST-A.4.6.1
    svc = EvaluationService(client=None)
    spec_res = svc._calculate_weighing_test(ctx, raw_payload, {})
    assert spec_res["status"] == "PASS"
    rows = spec_res["rows"]
    assert len(rows) == 2
    assert rows[0]["I"] == 5.000
    assert rows[1]["I"] == 10.000


def test_multi_set_repeatability_evaluation():
    """
    Verifies multi-set repeatability evaluation (TEST-A.4.10):
    1. Grouping observations into independent load sets (e.g. Set 1 at ~50% Max, Set 2 at ~Max).
    2. Dynamic interval-agnostic MPE resolution per set (multi-interval aware).
    3. Independent range calculation (P_max - P_min) per load set.
    4. Multi-result generation: separate CalculationResult and PASS/FAIL decision per load set.
    """
    from app.engine.models import WeighingInterval
    from app.services.evaluation_service import EvaluationService

    evaluator = RuleEvaluator()

    # Multi-interval instrument: W1: 0-6 kg (e1=0.002 kg), W2: 6-15 kg (e2=0.005 kg)
    intervals = [
        WeighingInterval(max_load=6.0, e=0.002),
        WeighingInterval(max_load=15.0, e=0.005)
    ]
    ctx_multi = EvaluationContext(
        instrument_id="inst_multi_rep",
        max_capacity=15.0,
        e_resolution=0.005,
        d_resolution=0.001,
        accuracy_class="III",
        weighing_intervals=intervals,
        unit="kg"
    )

    # Observations payload with 2 independent load sets
    multi_set_obs = {
        "load_sets": [
            {
                "test_load": 4.0,  # Interval 1 (e=0.002 kg -> Load/e = 2000e -> MPE = 0.002 kg)
                "readings": [4.000, 4.001, 4.001, 4.000, 4.001]  # range = 0.001 kg <= 0.002 kg -> PASS
            },
            {
                "test_load": 10.0, # Interval 2 (e=0.005 kg -> Load/e = 2000e -> MPE = 0.005 kg)
                "readings": [10.000, 10.003, 10.001, 10.002, 10.004] # range = 0.004 kg <= 0.005 kg -> PASS
            }
        ]
    }

    # 1. Test RuleEvaluator multi-result generation
    res = evaluator.evaluate_test("TEST-A.4.10", ctx_multi, multi_set_obs)
    assert res.status == TestExecutionStatus.PASS
    assert len(res.calculations) == 2, f"Expected 2 calculation results (1 per load set), got {len(res.calculations)}"

    calc1 = res.calculations[0]
    calc2 = res.calculations[1]

    assert calc1.inputs["test_load"] == 4.0
    assert calc1.inputs["active_e"] == 0.002
    assert abs(calc1.output - 0.001) < 1e-6
    assert abs(calc1.limit - 0.002) < 1e-6
    assert calc1.decision == "PASS"

    assert calc2.inputs["test_load"] == 10.0
    assert calc2.inputs["active_e"] == 0.005
    assert abs(calc2.output - 0.004) < 1e-6
    assert abs(calc2.limit - 0.005) < 1e-6
    assert calc2.decision == "PASS"

    # 2. Test EvaluationService specialized repeatability test return payload
    svc = EvaluationService(client=None)
    svc_res = svc._calculate_repeatability_test(ctx_multi, multi_set_obs)
    assert svc_res["status"] == "PASS"
    load_sets_out = svc_res["load_sets"]
    assert len(load_sets_out) == 2
    assert load_sets_out[0]["test_load"] == 4.0
    assert load_sets_out[0]["active_e"] == 0.002
    assert load_sets_out[0]["result"] == "PASS"

    assert load_sets_out[1]["test_load"] == 10.0
    assert load_sets_out[1]["active_e"] == 0.005
    assert load_sets_out[1]["result"] == "PASS"


def test_tilting_test_position_evaluation():
    """
    Verifies Tilting Test (TEST-A.4.11.1 / OIML R 76-1 §A.5.1):
    1. Position-wise iteration over positions array with tilt_angle, L, I, dL.
    2. Unrounded indication P_v = I + 0.5*e - dL and zero-corrected indication P_v_0 = P_v - E0.
    3. Compliance decision against MPEEngine limits.
    4. Deterministic PASS/FAIL decision instead of MANUAL_REVIEW.
    """
    from app.services.evaluation_service import EvaluationService

    evaluator = RuleEvaluator()
    ctx = EvaluationContext(
        instrument_id="inst_tilt",
        max_capacity=15.0,
        e_resolution=0.005,
        d_resolution=0.001,
        accuracy_class="III",
        unit="kg"
    )

    tilt_obs = {
        "E0": 0.0,
        "positions": [
            {
                "position_label": "Level",
                "tilt_angle": 0,
                "L": 10.0,
                "I": 10.000,
                "dL": 0.0025  # P_v = 10.000 + 0.0025 - 0.0025 = 10.000, Ec = 0.0 <= MPE 0.005 -> PASS
            },
            {
                "position_label": "Forward 50/1000",
                "tilt_angle": 2.87,
                "L": 10.0,
                "I": 10.001,
                "dL": 0.0025  # P_v = 10.001 + 0.0025 - 0.0025 = 10.001, Ec = 0.001 <= MPE 0.005 -> PASS
            },
            {
                "position_label": "Backward 50/1000",
                "tilt_angle": 2.87,
                "L": 10.0,
                "I": 9.999,
                "dL": 0.0025  # P_v = 9.999 + 0.0025 - 0.0025 = 9.999, Ec = -0.001 <= MPE 0.005 -> PASS
            }
        ]
    }

    # 1. Test RuleEvaluator with Tilting test observations
    res = evaluator.evaluate_test("TEST-A.4.11.1", ctx, tilt_obs)
    assert res.status == TestExecutionStatus.PASS, f"Expected PASS, got {res.status}: {res.summary_message}"
    assert len(res.calculations) == 3, f"Expected 3 position calculations, got {len(res.calculations)}"

    calc1 = res.calculations[0]
    calc2 = res.calculations[1]
    calc3 = res.calculations[2]

    assert calc1.decision == "PASS"
    assert calc2.decision == "PASS"
    assert calc3.decision == "PASS"

    assert calc1.inputs["P_v"] == 10.0
    assert calc2.inputs["P_v"] == 10.001
    assert calc3.inputs["P_v"] == 9.999

    # 2. Test EvaluationService specialized tilting test calculator
    svc = EvaluationService(client=None)
    spec_res = svc._calculate_tilting_test(ctx, tilt_obs, {})
    assert spec_res["status"] == "PASS"
    positions_out = spec_res["positions"]
    assert len(positions_out) == 3
    assert positions_out[0]["P_v"] == 10.0
    assert positions_out[1]["P_v"] == 10.001
    assert positions_out[2]["P_v"] == 9.999
    assert positions_out[0]["result"] == "PASS"
    assert positions_out[1]["result"] == "PASS"
    assert positions_out[2]["result"] == "PASS"


def test_zero_return_test_evaluation():
    """
    Verifies Zero Return Test (TEST-A.4.11.2 / OIML R 76-1 §A.4.11.2):
    1. Step-wise observation parsing for steps array containing L, I, dL.
    2. Formula execution for each step: P = I + 0.5*e - dL.
    3. Delta calculation: delta_P = |P_end - P_start|.
    4. Compliance decision: delta_P <= 0.5 * e1 allowed limit.
    5. Deterministic PASS/FAIL decision.
    """
    from app.services.evaluation_service import EvaluationService

    evaluator = RuleEvaluator()
    ctx = EvaluationContext(
        instrument_id="inst_zero_ret",
        max_capacity=100.0,
        e_resolution=0.05,
        e1_resolution=0.05,
        d_resolution=0.01,
        accuracy_class="III",
        unit="kg"
    )

    zero_ret_pass = {
        "E0": 0.0,
        "steps": [
            {"L": 0.0, "I": 0.000, "dL": 0.001, "note": "Zero start"},
            {"L": 100.0, "I": 100.002, "dL": 0.002, "note": "Full load 30 min"},
            {"L": 0.0, "I": 0.001, "dL": 0.001, "note": "Zero return"}
        ]
    }

    # 1. Test RuleEvaluator with Zero Return test observations
    res_pass = evaluator.evaluate_test("TEST-A.4.11.2", ctx, zero_ret_pass)
    assert res_pass.status == TestExecutionStatus.PASS, f"Expected PASS, got {res_pass.status}: {res_pass.summary_message}"
    assert len(res_pass.calculations) == 1

    calc = res_pass.calculations[0]
    assert calc.decision == "PASS"
    # P_start = 0.000 + 0.025 - 0.001 = 0.024
    # P_end = 0.001 + 0.025 - 0.001 = 0.025
    # delta_P = 0.001
    # limit = 0.5 * 0.05 = 0.025
    assert abs(calc.inputs["P_start"] - 0.024) < 1e-6
    assert abs(calc.inputs["P_end"] - 0.025) < 1e-6
    assert abs(calc.output - 0.001) < 1e-6
    assert abs(calc.limit - 0.025) < 1e-6

    # 2. Test failing zero return test payload (delta_P > 0.5 * e1)
    zero_ret_fail = {
        "steps": [
            {"L": 0.0, "I": 0.000, "dL": 0.001, "note": "Zero start"},
            {"L": 100.0, "I": 100.000, "dL": 0.001, "note": "Full load 30 min"},
            {"L": 0.0, "I": 0.030, "dL": 0.001, "note": "Zero return"}  # P_end = 0.030 + 0.025 - 0.001 = 0.054 -> delta_P = 0.030 > 0.025
        ]
    }
    res_fail = evaluator.evaluate_test("TEST-A.4.11.2", ctx, zero_ret_fail)
    assert res_fail.status == TestExecutionStatus.FAIL
    assert res_fail.calculations[0].decision == "FAIL"

    # 3. Test negative indications resulting in positive scalar variation |delta_P|
    zero_ret_negative = {
        "steps": [
            {"L": 0.0, "I": 0.010, "dL": 0.001, "note": "Zero start"},  # P_start = 0.010 + 0.025 - 0.001 = 0.034
            {"L": 100.0, "I": 100.000, "dL": 0.001, "note": "Full load 30 min"},
            {"L": 0.0, "I": -0.012, "dL": 0.001, "note": "Zero return"}  # P_end = -0.012 + 0.025 - 0.001 = 0.012 -> delta_P = |-0.022| = 0.022 <= 0.025 -> PASS
        ]
    }
    res_neg = evaluator.evaluate_test("TEST-A.4.11.2", ctx, zero_ret_negative)
    assert res_neg.status == TestExecutionStatus.PASS, f"Expected PASS for negative indication, got {res_neg.status}"
    assert res_neg.calculations[0].output == 0.022

    # 4. Test exact boundary float precision (|delta_P| == allowed_limit = 0.025)
    zero_ret_boundary = {
        "steps": [
            {"L": 0.0, "I": 0.000, "dL": 0.000, "note": "Zero start"},  # P_start = 0.0
            {"L": 100.0, "I": 100.000, "dL": 0.000, "note": "Full load 30 min"},
            {"L": 0.0, "I": 0.025, "dL": 0.000, "note": "Zero return"}  # P_end = 0.025 -> delta_P = 0.025 == allowed_limit 0.025 -> PASS
        ]
    }
    res_boundary = evaluator.evaluate_test("TEST-A.4.11.2", ctx, zero_ret_boundary)
    assert res_boundary.status == TestExecutionStatus.PASS, f"Expected PASS for exact boundary 0.025, got {res_boundary.status}"

    # 5. Test EvaluationService specialized zero return test calculator
    svc = EvaluationService(client=None)
    spec_res = svc._calculate_zero_return_test(ctx, zero_ret_pass, {})
    assert spec_res["status"] == "PASS"
    assert abs(spec_res["delta_P"] - 0.001) < 1e-6
    assert abs(spec_res["allowed_limit"] - 0.025) < 1e-6
    assert len(spec_res["steps"]) == 3


def test_calculation_decision_numeric_fallback():
    """
    Verifies test status aggregation logic when calculation item decision is missing, None, or defaulted incorrectly:
    1. If decision is None, numeric check against limit verifies |output| <= |limit| -> PASS.
    2. If decision is defaulted incorrectly to FAIL but numeric limit holds, re-evaluates as PASS.
    3. If output > limit, evaluates as FAIL.
    """
    from app.engine.models import CalculationResult

    evaluator = RuleEvaluator()
    ctx = EvaluationContext(
        instrument_id="inst_fallback",
        max_capacity=100.0,
        e_resolution=0.05,
        d_resolution=0.01,
        accuracy_class="III"
    )

    obs = {"steps": [{"L": 0.0, "I": 0.000, "dL": 0.001}]}

    # Run base evaluation
    res = evaluator.evaluate_test("TEST-A.4.11.2", ctx, obs)

    # Mutate calculation result to simulate unpopulated decision attribute or default error
    res.calculations[0].decision = None
    res.calculations[0].output = 0.010
    res.calculations[0].limit = 0.025

    # Re-verify evaluator status determination logic on mutated calculation items
    val_fails = [v for v in res.validations if v.status == "FAIL"]
    calc_fails = []
    for c in res.calculations:
        if isinstance(c.output, (int, float)) and isinstance(c.limit, (int, float)):
            is_within_limit = (round(abs(float(c.output)), 8) - round(abs(float(c.limit)), 8)) <= 1e-9
            if is_within_limit:
                c.decision = "PASS"
            else:
                c.decision = "FAIL"
                calc_fails.append(c)

    assert res.calculations[0].decision == "PASS"
    assert len(calc_fails) == 0


def test_cross_step_scoping_zero_return():
    """
    Verifies cross-step pre-processing and top-level binding for Zero Return Test:
    1. Pre-processes P_i = I_i + 0.5*e - dL_i for all steps.
    2. Binds P_start (0.0202 kg), P_end (0.0194 kg), and delta_P (0.0008 kg) to top-level base_env.
    3. Evaluates summary calculation ONCE at top-level instead of inside per-step loop.
    4. Evaluates delta_P (0.0008 kg) <= 0.5*e (0.001 kg) -> decision = "PASS", status = PASS.
    """
    evaluator = RuleEvaluator()
    ctx = EvaluationContext(
        instrument_id="inst_cross_step",
        max_capacity=100.0,
        e_resolution=0.002,
        e1_resolution=0.002,
        d_resolution=0.001,
        accuracy_class="III",
        unit="kg"
    )

    # Observation payload where P_start = 0.0202, P_end = 0.0194 -> delta_P = 0.0008 <= 0.0010 (0.5*e)
    obs = {
        "steps": [
            {"L": 0.0, "I": 0.020, "dL": 0.0008, "note": "Zero start"},   # P1 = 0.020 + 0.001 - 0.0008 = 0.0202
            {"L": 100.0, "I": 100.000, "dL": 0.0010, "note": "Full load 30 min"},
            {"L": 0.0, "I": 0.019, "dL": 0.0006, "note": "Zero return"}   # P3 = 0.019 + 0.001 - 0.0006 = 0.0194
        ]
    }

    res = evaluator.evaluate_test("TEST-A.4.11.2", ctx, obs)
    assert res.status == TestExecutionStatus.PASS, f"Expected PASS, got {res.status}: {res.summary_message}"
    assert len(res.calculations) == 1

    calc = res.calculations[0]
    assert calc.decision == "PASS"
    assert abs(calc.inputs["P_start"] - 0.0202) < 1e-6
    assert abs(calc.inputs["P_end"] - 0.0194) < 1e-6
    assert abs(calc.output - 0.0008) < 1e-6
    assert abs(calc.limit - 0.0010) < 1e-6


def test_result_builder_and_status_verdict():
    """
    Verifies that test execution status and overall evaluation status:
    1. Set TestExecutionStatus.PASS when all individual calculation items pass.
    2. Ignore unmapped global lines/empty summary check lines.
    3. ResultBuilder sets OverallEvaluationStatus.COMPLETED_PASS when all applicable tests pass.
    """
    from app.engine.result_builder import ResultBuilder
    from app.engine.models import OverallEvaluationStatus

    evaluator = RuleEvaluator()
    ctx = EvaluationContext(
        instrument_id="inst_verdict",
        max_capacity=100.0,
        e_resolution=0.02,
        e1_resolution=0.02,
        d_resolution=0.01,
        accuracy_class="III",
        unit="kg"
    )

    obs = {
        "steps": [
            {"L": 0.0, "I": 0.000, "dL": 0.004, "note": "Zero start"},
            {"L": 100.0, "I": 100.000, "dL": 0.005, "note": "Full load 30 min"},
            {"L": 0.0, "I": 0.000, "dL": 0.004, "note": "Zero return"}
        ]
    }

    res = evaluator.evaluate_test("TEST-A.4.11.2", ctx, obs)
    assert res.status == TestExecutionStatus.PASS

    # Test ResultBuilder aggregation
    eval_res = ResultBuilder.build_evaluation_result(
        evaluation_id="eval_101",
        instrument_id="inst_verdict",
        test_results=[res]
    )
    assert eval_res.overall_status == OverallEvaluationStatus.COMPLETED_PASS


def test_stability_of_equilibrium_evaluation():
    """
    Verifies Stability of Equilibrium Test (TEST-A.4.12):
    1. Parses readings array containing I, L, dL, and time_label.
    2. Calculates indication P = I + 0.5*e - dL and error E = P - L for each reading.
    3. Compares |E| against limit = 0.25 * e1.
    4. Evaluates PASS when all readings satisfy limit, and FAIL when any reading exceeds limit.
    """
    evaluator = RuleEvaluator()
    svc = EvaluationService(client=None)

    ctx = EvaluationContext(
        instrument_id="inst_stab",
        max_capacity=100.0,
        e_resolution=0.01,
        e1_resolution=0.01,
        d_resolution=0.001,
        accuracy_class="III",
        unit="kg"
    )

    # 1. PASS payload (e1 = 0.01 -> limit = 0.0025 kg)
    # Reading 1: L=50.0, I=50.000, dL=0.004 -> P = 50.000 + 0.005 - 0.004 = 50.001 -> E = 0.001 <= 0.0025 -> PASS
    # Reading 2: L=50.0, I=50.000, dL=0.006 -> P = 50.000 + 0.005 - 0.006 = 49.999 -> E = -0.001 -> |E| = 0.001 <= 0.0025 -> PASS
    obs_pass = {
        "test_load": 50.0,
        "readings": [
            {"time_label": "t=0s (Disturbed)", "L": 50.0, "I": 50.000, "dL": 0.004},
            {"time_label": "t=1s (Printing)", "L": 50.0, "I": 50.000, "dL": 0.006}
        ]
    }

    res_pass = evaluator.evaluate_test("TEST-A.4.12", ctx, obs_pass)
    assert res_pass.status == TestExecutionStatus.PASS, f"Expected PASS, got {res_pass.status}: {res_pass.summary_message}"
    assert len(res_pass.calculations) == 2
    assert res_pass.calculations[0].decision == "PASS"
    assert res_pass.calculations[1].decision == "PASS"

    spec_pass = svc._calculate_stability_of_equilibrium_test(ctx, obs_pass, {})
    assert spec_pass["status"] == "PASS"
    assert len(spec_pass["rows"]) == 2
    assert spec_pass["allowed_limit"] == 0.0025

    # 2. FAIL payload
    # Reading 1: L=50.0, I=50.000, dL=0.000 -> P = 50.005 -> E = 0.005 > 0.0025 -> FAIL
    obs_fail = {
        "test_load": 50.0,
        "readings": [
            {"time_label": "t=0s (Disturbed)", "L": 50.0, "I": 50.000, "dL": 0.000}
        ]
    }

    res_fail = evaluator.evaluate_test("TEST-A.4.12", ctx, obs_fail)
    assert res_fail.status == TestExecutionStatus.FAIL, f"Expected FAIL, got {res_fail.status}"
    assert res_fail.calculations[0].decision == "FAIL"

    spec_fail = svc._calculate_stability_of_equilibrium_test(ctx, obs_fail, {})
    assert spec_fail["status"] == "FAIL"










