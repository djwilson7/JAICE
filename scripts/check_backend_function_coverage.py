from __future__ import annotations

import ast
import fnmatch
import json
import sys
from pathlib import Path
from collections import defaultdict


THRESHOLD = 100.0
COVERAGE_JSON = Path("coverage.json")
REPORT_PATH = Path("docs/BACKEND_TEST_RESULTS.md")

OMIT_PATTERNS = (
    "client_api/db/schema/*",
    "client_api/db/validate_new_supabase_schema.py",
    "client_api/db/apply_migration_asyncpg.py",
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


def format_missing_lines(missing_lines: list[int]) -> str:
    if not missing_lines:
        return ""
    missing_lines = sorted(missing_lines)
    ranges = []
    start = missing_lines[0]
    end = missing_lines[0]
    for i in range(1, len(missing_lines)):
        if missing_lines[i] == end + 1:
            end = missing_lines[i]
        else:
            if start == end:
                ranges.append(str(start))
            else:
                ranges.append(f"{start}-{end}")
            start = missing_lines[i]
            end = missing_lines[i]
    if start == end:
        ranges.append(str(start))
    else:
        ranges.append(f"{start}-{end}")
    return ", ".join(ranges)


def generate_markdown_report(report_data: dict, file_stats: dict, total_funcs: int, covered_funcs: int) -> None:
    totals = report_data.get("totals", {})
    
    statements = totals.get("num_statements", 0)
    covered_statements = totals.get("covered_lines", 0) # coverage.py uses covered_lines for statements
    statements_pct = (covered_statements / statements * 100) if statements else 100.0
    
    branches = totals.get("num_branches", 0)
    covered_branches = totals.get("covered_branches", 0)
    branches_pct = (covered_branches / branches * 100) if branches else 100.0
    
    funcs_pct = (covered_funcs / total_funcs * 100) if total_funcs else 100.0
    
    # We use statements as lines in Python coverage
    lines_pct = statements_pct

    md_lines = []
    md_lines.append("# Pytest Backend Coverage Report\n")
    md_lines.append("## Summary")
    md_lines.append("| Metric | Coverage |")
    md_lines.append("| :--- | :--- |")
    md_lines.append(f"| **Statements** | {statements_pct:.2f}% ({covered_statements}/{statements}) |")
    md_lines.append(f"| **Branches** | {branches_pct:.2f}% ({covered_branches}/{branches}) |")
    md_lines.append(f"| **Functions** | {funcs_pct:.2f}% ({covered_funcs}/{total_funcs}) |")
    md_lines.append(f"| **Lines** | {lines_pct:.2f}% ({covered_statements}/{statements}) |\n")
    
    md_lines.append("## Detailed Coverage\n")
    md_lines.append("| Name | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s |")
    md_lines.append("| :--- | :--- | :--- | :--- | :--- | :--- |")
    for path, stats in sorted(file_stats.items(), key=lambda x: x[0]):
        norm_path = path.replace("\\", "/")
        s_pct = stats["stmt_pct"]
        b_pct = stats["branch_pct"]
        f_pct = stats["func_pct"]
        l_pct = stats["line_pct"]
        missing_lines_str = stats.get("missing_lines", "")
        
        s_str = f"{s_pct:.2f}".rstrip("0").rstrip(".") if isinstance(s_pct, float) else s_pct
        b_str = f"{b_pct:.2f}".rstrip("0").rstrip(".") if isinstance(b_pct, float) else b_pct
        f_str = f"{f_pct:.2f}".rstrip("0").rstrip(".") if isinstance(f_pct, float) else f_pct
        l_str = f"{l_pct:.2f}".rstrip("0").rstrip(".") if isinstance(l_pct, float) else l_pct
        
        md_lines.append(f"| {norm_path} | {s_str} | {b_str} | {f_str} | {l_str} | {missing_lines_str} |")
    md_lines.append("")
        
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text("\n".join(md_lines), encoding="utf-8")


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
    total_functions_overall = 0
    covered_functions_overall = 0
    missed_functions: list[str] = []

    file_stats = {}

    for raw_path, file_report in sorted(report.get("files", {}).items()):
        path = _norm(raw_path)
        if _omitted(path) or not path.endswith(".py"):
            continue
        source_path = Path(path)
        if not source_path.exists():
            continue

        executed = set(file_report.get("executed_lines", []))
        summary = file_report.get("summary", {})
        
        num_statements = summary.get("num_statements", 0)
        covered_lines = summary.get("covered_lines", 0)
        num_branches = summary.get("num_branches", 0)
        covered_branches = summary.get("covered_branches", 0)
        
        stmt_pct = (covered_lines / num_statements * 100) if num_statements else 100.0
        branch_pct = (covered_branches / num_branches * 100) if num_branches else 100.0
        
        if num_statements:
            total_files += 1
            if executed:
                covered_files += 1
            else:
                missed_files.append(path)

        try:
            tree = ast.parse(source_path.read_text(encoding="utf-8"))
        except SyntaxError:
            continue

        file_funcs = 0
        file_funcs_cov = 0

        for node in ast.walk(tree):
            if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            body_lines = _function_body_lines(node)
            if not body_lines:
                continue
            
            file_funcs += 1
            total_functions_overall += 1
            name = getattr(node, "name", "<unknown>")
            if body_lines & executed:
                file_funcs_cov += 1
                covered_functions_overall += 1
            else:
                missed_functions.append(f"{path}:{node.lineno} {name}")
                
        func_pct = (file_funcs_cov / file_funcs * 100) if file_funcs else 100.0

        file_stats[path] = {
            "stmt_pct": stmt_pct,
            "branch_pct": branch_pct,
            "func_pct": func_pct,
            "line_pct": stmt_pct,
            "missing_lines": format_missing_lines(file_report.get("missing_lines", [])),
        }

    file_percent = (covered_files / total_files * 100.0) if total_files else 100.0
    function_percent = (
        covered_functions_overall / total_functions_overall * 100.0 if total_functions_overall else 100.0
    )
    
    generate_markdown_report(report, file_stats, total_functions_overall, covered_functions_overall)
    
    print(f"Backend file coverage: {covered_files}/{total_files} = {file_percent:.2f}%")
    print(f"Backend line coverage: {line_percent:.2f}%")
    print(f"Backend branch coverage: {branch_percent:.2f}%")
    print(
        "Backend function coverage: "
        f"{covered_functions_overall}/{total_functions_overall} = {function_percent:.2f}%"
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
