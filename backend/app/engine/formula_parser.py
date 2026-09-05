"""
METRA — app/engine/formula_parser.py
AST-based safe formula evaluator for mathematical expressions in calculation rules.
Restricted whitelist: math operations, abs, min, max, sqrt, round, sum, len.
"""

import ast
import math
from typing import Dict, Any, Union


ALLOWED_FUNCTIONS = {
    "abs": abs,
    "min": min,
    "max": max,
    "sqrt": math.sqrt,
    "round": round,
    "sum": sum,
    "len": len,
    "float": float,
    "int": int,
}

ALLOWED_NODES = {
    ast.Expression,
    ast.BinOp,
    ast.UnaryOp,
    ast.Add,
    ast.Sub,
    ast.Mult,
    ast.Div,
    ast.FloorDiv,
    ast.Mod,
    ast.Pow,
    ast.USub,
    ast.UAdd,
    ast.Name,
    ast.Constant,
    ast.Constant,  # Python <= 3.7 compatibility
    ast.Call,
    ast.Load,
    ast.List,
    ast.Tuple,
    ast.Compare,
    ast.Eq,
    ast.NotEq,
    ast.Lt,
    ast.LtE,
    ast.Gt,
    ast.GtE,
}


class FormulaEvaluationError(Exception):
    pass


def _eval_node(node: ast.AST, variables: Dict[str, Any]) -> Any:
    if type(node) not in ALLOWED_NODES:
        raise FormulaEvaluationError(f"Disallowed AST node expression type: {type(node).__name__}")

    if isinstance(node, ast.Expression):
        return _eval_node(node.body, variables)

    elif isinstance(node, ast.Constant):
        return node.value

    elif isinstance(node, (ast.Num,)):
        return node.n

    elif isinstance(node, ast.Name):
        if node.id in variables:
            return variables[node.id]
        elif node.id in ALLOWED_FUNCTIONS:
            return ALLOWED_FUNCTIONS[node.id]
        elif node.id == "True":
            return True
        elif node.id == "False":
            return False
        elif node.id == "None":
            return None
        raise FormulaEvaluationError(f"Undefined variable in expression: {node.id}")

    elif isinstance(node, ast.BinOp):
        left = _eval_node(node.left, variables)
        right = _eval_node(node.right, variables)
        if isinstance(node.op, ast.Add):
            return left + right
        elif isinstance(node.op, ast.Sub):
            return left - right
        elif isinstance(node.op, ast.Mult):
            return left * right
        elif isinstance(node.op, ast.Div):
            if right == 0:
                raise FormulaEvaluationError("Division by zero in formula")
            return left / right
        elif isinstance(node.op, ast.FloorDiv):
            if right == 0:
                raise FormulaEvaluationError("Division by zero in formula")
            return left // right
        elif isinstance(node.op, ast.Mod):
            return left % right
        elif isinstance(node.op, ast.Pow):
            return left ** right

    elif isinstance(node, ast.UnaryOp):
        operand = _eval_node(node.operand, variables)
        if isinstance(node.op, ast.USub):
            return -operand
        elif isinstance(node.op, ast.UAdd):
            return +operand

    elif isinstance(node, ast.List):
        return [_eval_node(elt, variables) for elt in node.elts]

    elif isinstance(node, ast.Tuple):
        return tuple(_eval_node(elt, variables) for elt in node.elts)

    elif isinstance(node, ast.Call):
        func = _eval_node(node.func, variables)
        if func not in ALLOWED_FUNCTIONS.values():
            raise FormulaEvaluationError(f"Disallowed function call in expression")
        args = [_eval_node(arg, variables) for arg in node.args]
        return func(*args)

    elif isinstance(node, ast.Compare):
        left = _eval_node(node.left, variables)
        for op, comparator in zip(node.ops, node.comparators):
            right = _eval_node(comparator, variables)
            if isinstance(op, ast.Eq) and not (left == right):
                return False
            elif isinstance(op, ast.NotEq) and not (left != right):
                return False
            elif isinstance(op, ast.Lt) and not (left < right):
                return False
            elif isinstance(op, ast.LtE) and not (left <= right):
                return False
            elif isinstance(op, ast.Gt) and not (left > right):
                return False
            elif isinstance(op, ast.GtE) and not (left >= right):
                return False
            left = right
        return True

    raise FormulaEvaluationError(f"Unsupported AST node: {type(node).__name__}")


def evaluate_expression(expression: str, variables: Dict[str, Any]) -> Any:
    """
    Safely parses and evaluates a math formula against provided variables.
    """
    if not expression or not expression.strip():
        raise FormulaEvaluationError("Empty expression")

    # Clean formula syntax if needed (e.g. replacing unicode symbols)
    clean_expr = expression.replace("−", "-").replace("×", "*").replace("÷", "/")

    try:
        parsed = ast.parse(clean_expr, mode='eval')
        return _eval_node(parsed, variables)
    except Exception as e:
        if isinstance(e, FormulaEvaluationError):
            raise e
        raise FormulaEvaluationError(f"Error evaluating formula '{expression}': {str(e)}")
