"""Check that the active runtime .env database connection reaches Supabase."""

from __future__ import annotations

from pathlib import Path

import psycopg


def load_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key] = value.strip().strip('"').strip("'")
    return values


def main() -> None:
    env = load_env(Path(".env"))
    url = env.get("CLIENT_DATABASE_URL")
    if not url:
        raise RuntimeError("CLIENT_DATABASE_URL is missing from .env")

    with psycopg.connect(url, connect_timeout=15) as conn:
        database, user = conn.execute("select current_database(), current_user").fetchone()
        tables = conn.execute(
            """
            select table_schema, table_name
            from information_schema.tables
            where table_schema in ('public', 'internal_staging')
              and table_name in ('job_applications', 'user_account', 'email_staging')
            order by table_schema, table_name;
            """
        ).fetchall()

    print(
        {
            "connected": True,
            "database": database,
            "user": user,
            "critical_tables": [(schema, table) for schema, table in tables],
        }
    )


if __name__ == "__main__":
    main()
