from __future__ import annotations

import ast
import fnmatch
import json
import sys
from pathlib import Path


THRESHOLD = 100.0
COVERAGE_JSON = Path("coverage.json")

OMIT_PATTERNS = (
    "client_api/db/schema/*",
    "client_api/db/validate_new_supabase_schema.py",
    "client_api/db/apply_migration_asyncpg.py",
    "classification/class_worker.py",
    "gmail/gmail_worker.py",
    "relevance/relevance_worker.py",
    "ner/ner_worker.py",
    "shared_worker_library/celery_app.py",
    "OpenAI/*",
    "supabase/*",
    "*/setup.py",
    "*/test_*.py",
    "*/__init__.py",
)


def _norm(path: str | Path) -> str:
    return Path(path).as_posix()


def _omitted(path: str) -> bool:
    return any(fnmatch.fnmatch(path, pattern) for pattern in OMIT_PATTERNS)


def _function_body_lines(node: ast.AST) -> set[int]:
    lines: set[int] = set()
    for child in ast.walk(node):
        lineno = getattr(child, "lineno", None)
        if lineno is not None:
            lines.add(lineno)
    lines.discard(getattr(node, "lineno", -1))
    return lines


def main() -> int:
    if not COVERAGE_JSON.exists():
        print("coverage.json not found; run pytest with --cov-report=json first", file=sys.stderr)
        return 2

    report = json.loads(COVERAGE_JSON.read_text(encoding="utf-8"))
    totals = report.get("totals", {})
    line_percent = float(totals.get("percent_statements_covered", 0.0))
    branch_percent = float(totals.get("percent_branches_covered", 0.0))
    covered_files = 0
    total_files = 0
    missed_files: list[str] = []
    covered_functions = 0
    total_functions = 0
    missed_functions: list[str] = []

    for raw_path, file_report in sorted(report.get("files", {}).items()):
        path = _norm(raw_path)
        if _omitted(path) or not path.endswith(".py"):
            continue
        source_path = Path(path)
        if not source_path.exists():
            continue

        executed = set(file_report.get("executed_lines", []))
        if file_report.get("summary", {}).get("num_statements", 0):
            total_files += 1
            if executed:
                covered_files += 1
            else:
                missed_files.append(path)

        try:
            tree = ast.parse(source_path.read_text(encoding="utf-8"))
        except SyntaxError:
            continue

        for node in ast.walk(tree):
            if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            body_lines = _function_body_lines(node)
            if not body_lines:
                continue
            total_functions += 1
            name = getattr(node, "name", "<unknown>")
            if body_lines & executed:
                covered_functions += 1
            else:
                missed_functions.append(f"{path}:{node.lineno} {name}")

    file_percent = (covered_files / total_files * 100.0) if total_files else 100.0
    function_percent = (
        covered_functions / total_functions * 100.0 if total_functions else 100.0
    )
    print(f"Backend file coverage: {covered_files}/{total_files} = {file_percent:.2f}%")
    print(f"Backend line coverage: {line_percent:.2f}%")
    print(f"Backend branch coverage: {branch_percent:.2f}%")
    print(
        "Backend function coverage: "
        f"{covered_functions}/{total_functions} = {function_percent:.2f}%"
    )
    failed = False
    if file_percent < THRESHOLD:
        print(f"File coverage is below {THRESHOLD:.2f}%. First missed files:")
        for item in missed_files[:40]:
            print(f"  {item}")
        failed = True
    if line_percent < THRESHOLD:
        print(f"Line coverage is below {THRESHOLD:.2f}%.")
        failed = True
    if branch_percent < THRESHOLD:
        print(f"Branch coverage is below {THRESHOLD:.2f}%.")
        failed = True
    if function_percent < THRESHOLD:
        print(f"Function coverage is below {THRESHOLD:.2f}%. First missed functions:")
        for item in missed_functions[:40]:
            print(f"  {item}")
        failed = True
    return 2 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
