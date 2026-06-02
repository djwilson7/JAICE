from __future__ import annotations

import subprocess
import sys


def run(command: list[str]) -> None:
    completed = subprocess.run(command, check=False)
    if completed.returncode != 0:
        raise SystemExit(completed.returncode)


def main() -> int:
    run([sys.executable, "-m", "pytest", "tests/backend", "-q"])
    run([sys.executable, "scripts/check_backend_function_coverage.py"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
