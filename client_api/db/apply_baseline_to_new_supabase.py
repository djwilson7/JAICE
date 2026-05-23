"""Apply the JAICE schema baseline to the new Supabase migration target."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import psycopg

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from client_api.db.migration_env import assert_not_runtime_database, require_migration_env


CRITICAL_TABLES = (
    ("public", "job_applications"),
    ("public", "user_account"),
    ("internal_staging", "email_staging"),
)

MIGRATION_PATH = Path("supabase/migrations/20260523_baseline_schema.sql")


def fetch_existing_app_tables(conn: psycopg.Connection) -> list[tuple[str, str]]:
    with conn.cursor() as cur:
        cur.execute(
            """
            select table_schema, table_name
            from information_schema.tables
            where table_schema in ('public', 'internal_staging')
              and table_type = 'BASE TABLE'
            order by table_schema, table_name;
            """
        )
        return [(str(row[0]), str(row[1])) for row in cur.fetchall()]


def run_preflight(conn: psycopg.Connection, allow_existing: bool) -> list[tuple[str, str]]:
    existing = fetch_existing_app_tables(conn)
    critical = [table for table in existing if table in CRITICAL_TABLES]
    if critical and not allow_existing:
        raise RuntimeError(
            "Target already has critical app tables. "
            f"Refusing to apply without --allow-existing. Existing critical tables: {critical}"
        )
    return existing


def apply_migration(conn: psycopg.Connection) -> None:
    sql = MIGRATION_PATH.read_text(encoding="utf-8")
    if "internal_staing" in sql:
        raise RuntimeError("Baseline still contains internal_staing typo")
    with conn.transaction():
        conn.execute(sql)


def apply_sql_file(conn: psycopg.Connection, path: Path) -> None:
    sql = path.read_text(encoding="utf-8")
    if "internal_staing" in sql:
        raise RuntimeError(f"{path} contains internal_staing typo")
    with conn.transaction():
        conn.execute(sql)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--preflight-only", action="store_true")
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--apply-file")
    parser.add_argument("--allow-existing", action="store_true")
    parser.add_argument(
        "--url-key",
        default="NEW_CLIENT_DATABASE_URL",
        choices=["NEW_CLIENT_DATABASE_URL", "NEW_WORKER_DATABASE_URL"],
        help="Migration target URL key from .env.db_migration.",
    )
    args = parser.parse_args()

    if not args.preflight_only and not args.apply and not args.apply_file:
        raise SystemExit("Choose --preflight-only, --apply, or --apply-file")

    env = require_migration_env()
    target_url = env[args.url_key]
    assert_not_runtime_database(target_url)

    if not MIGRATION_PATH.exists():
        raise RuntimeError(f"Missing migration file: {MIGRATION_PATH}")

    with psycopg.connect(target_url, connect_timeout=15) as conn:
        database, user = conn.execute("select current_database(), current_user").fetchone()
        existing = run_preflight(conn, allow_existing=args.allow_existing)
        print(
            {
                "connected": True,
                "database": database,
                "user": user,
                "url_key": args.url_key,
                "existing_app_tables": existing,
            }
        )

        if args.preflight_only:
            return

        if args.apply:
            apply_migration(conn)
            print({"migration_applied": True, "file": str(MIGRATION_PATH)})

        if args.apply_file:
            path = Path(args.apply_file)
            apply_sql_file(conn, path)
            print({"migration_applied": True, "file": str(path)})


if __name__ == "__main__":
    main()
