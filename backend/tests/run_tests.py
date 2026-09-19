import sys
from pathlib import Path

# Add backend root to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from tests.test_rule_engine import (
    test_rule_loader,
    test_formula_parser,
    test_applicability_engine,
    test_mpe_engine,
    test_input_validator,
    test_rule_evaluator_pass,
    test_zero_setting_accuracy_test,
    test_multi_row_array_iteration,
    test_tare_weighing_i_net_mapping,
    test_multi_set_repeatability_evaluation,
    test_tilting_test_position_evaluation,
    test_zero_return_test_evaluation,
    test_calculation_decision_numeric_fallback,
    test_result_builder_and_status_verdict,
    test_stability_of_equilibrium_evaluation
)

if __name__ == "__main__":
    print("Running OIML R-76 Rule Engine Test Suite...")
    test_rule_loader()
    print(" [x] Rule Loader test passed")
    test_formula_parser()
    print(" [x] Formula Parser test passed")
    test_applicability_engine()
    print(" [x] Applicability Engine test passed")
    test_mpe_engine()
    print(" [x] MPE Engine test passed")
    test_input_validator()
    print(" [x] Input Validator test passed")
    test_rule_evaluator_pass()
    print(" [x] Rule Evaluator test passed")
    test_zero_setting_accuracy_test()
    print(" [x] Zero Setting Accuracy (TEST-A.4.2.3) test passed")
    test_multi_row_array_iteration()
    print(" [x] Multi-Row Array Iteration test passed")
    test_tare_weighing_i_net_mapping()
    print(" [x] Tare Weighing (TEST-A.4.6.1) I_net Mapping test passed")
    test_multi_set_repeatability_evaluation()
    print(" [x] Multi-Set Repeatability (TEST-A.4.10) Evaluation test passed")
    test_tilting_test_position_evaluation()
    print(" [x] Tilting Test (TEST-A.4.11.1) Position Evaluation test passed")
    test_zero_return_test_evaluation()
    print(" [x] Zero Return Test (TEST-A.4.11.2) Evaluation test passed")
    test_calculation_decision_numeric_fallback()
    print(" [x] Calculation Decision Numeric Fallback test passed")
    test_result_builder_and_status_verdict()
    print(" [x] Result Builder and Status Verdict test passed")
    test_stability_of_equilibrium_evaluation()
    print(" [x] Stability of Equilibrium (TEST-A.4.12) Evaluation test passed")
    print("\nSUCCESS: All 15 Rule Engine tests passed cleanly!")
