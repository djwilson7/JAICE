"""Helpers for one-off Supabase migration scripts."""

from __future__ import annotations

import os
from pathlib import Path
from urllib.parse import urlparse


ENV_FILE = Path(".env.db_migration")
RUNTIME_ENV_FILE = Path(".env")


def load_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def require_migration_env() -> dict[str, str]:
    if not ENV_FILE.exists():
        raise RuntimeError(f"{ENV_FILE} does not exist")

    env = load_env_file(ENV_FILE)
    required = [
        "NEW_SUPABASE_URL",
        "NEW_SUPABASE_ANON_KEY",
        "NEW_SUPABASE_JWT_SECRET",
        "NEW_CLIENT_DATABASE_URL",
        "NEW_WORKER_DATABASE_URL",
    ]
    missing = [key for key in required if not env.get(key)]
    placeholders = [
        key
        for key in required
        if env.get(key, "").startswith("PLACEHOLDER")
    ]
    if missing or placeholders:
        raise RuntimeError(
            f"{ENV_FILE} is not ready. missing={missing}, placeholders={placeholders}"
        )
    return env


def read_runtime_database_url() -> str | None:
    if not RUNTIME_ENV_FILE.exists():
        return os.environ.get("CLIENT_DATABASE_URL")
    env = load_env_file(RUNTIME_ENV_FILE)
    return env.get("CLIENT_DATABASE_URL") or os.environ.get("CLIENT_DATABASE_URL")


def normalized_database_identity(database_url: str) -> tuple[str, int | None, str, str]:
    parsed = urlparse(database_url)
    return (
        parsed.hostname or "",
        parsed.port,
        parsed.username or "",
        parsed.path.lstrip("/"),
    )


def assert_not_runtime_database(target_url: str) -> None:
    runtime_url = read_runtime_database_url()
    if not runtime_url:
        return

    if target_url == runtime_url:
        raise RuntimeError("NEW_CLIENT_DATABASE_URL exactly matches CLIENT_DATABASE_URL")

    if normalized_database_identity(target_url) == normalized_database_identity(runtime_url):
        raise RuntimeError(
            "NEW_CLIENT_DATABASE_URL appears to target the same database identity as CLIENT_DATABASE_URL"
        )
