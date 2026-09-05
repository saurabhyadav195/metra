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
    test_rule_evaluator_pass
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
    print("\nSUCCESS: All 6 Rule Engine tests passed cleanly!")
