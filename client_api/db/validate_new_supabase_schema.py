"""Validate the rebuilt Supabase schema with catalog checks and synthetic rows."""

from __future__ import annotations

import json
import sys
import uuid
import argparse
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import psycopg
from psycopg.rows import dict_row

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from client_api.db.migration_env import assert_not_runtime_database, require_migration_env


REPORT_PATH = Path("client_api/db/schema/new_supabase_validation_report.json")

REQUIRED_TABLES = {
    ("internal_staging", "email_staging"),
    ("public", "app_events"),
    ("public", "job_applications"),
    ("public", "user_account"),
    ("public", "user_notification_settings"),
}
REQUIRED_COLUMNS = {
    ("internal_staging", "email_staging", "id"),
    ("internal_staging", "email_staging", "user_id_enc"),
    ("internal_staging", "email_staging", "trace_id"),
    ("internal_staging", "email_staging", "provider_message_id"),
    ("public", "app_events", "event_id"),
    ("public", "app_events", "job_fk"),
    ("public", "app_events", "user_uid"),
    ("public", "app_events", "event_type"),
    ("public", "job_applications", "id"),
    ("public", "job_applications", "user_uid"),
    ("public", "job_applications", "title_enc"),
    ("public", "job_applications", "company_name_enc"),
    ("public", "job_applications", "description_enc"),
    ("public", "job_applications", "recruiter_name_enc"),
    ("public", "job_applications", "recruiter_email_enc"),
    ("public", "job_applications", "note_enc"),
    ("public", "job_applications", "app_stage"),
    ("public", "job_applications", "provider_message_id"),
    ("public", "job_applications", "updated_at"),
    ("public", "user_account", "user_id"),
    ("public", "user_account", "backend_rls_jwt"),
    ("public", "user_notification_settings", "user_uid"),
}
REQUIRED_SEQUENCES = {
    ("public", "app_events_event_id_seq"),
    ("public", "job_applications_id_seq"),
}
REQUIRED_CONSTRAINTS = {
    ("internal_staging", "email_staging", "email_staging_pkey"),
    ("public", "app_events", "app_events_pkey"),
    ("public", "app_events", "app_events_job_fk_fkey"),
    ("public", "job_applications", "job_applications_pkey"),
    ("public", "job_applications", "job_applications_provider_message_id_key"),
    ("public", "job_applications", "fk_user_account_uid"),
    ("public", "user_account", "user_account_pkey"),
    ("public", "user_notification_settings", "user_notification_settings_pkey"),
    ("public", "user_notification_settings", "user_notification_settings_user_uid_fkey"),
}
REQUIRED_INDEXES = {
    ("internal_staging", "email_staging", "idx_email_staging_provider_msg"),
    ("internal_staging", "email_staging", "idx_email_staging_user"),
    ("public", "app_events", "app_events_job_fk_idx"),
    ("public", "app_events", "app_events_user_uid_idx"),
    ("public", "job_applications", "job_applications_user_uid_idx"),
}
REQUIRED_FUNCTIONS = {
    ("internal_staging", "remove_purged_emails"),
    ("public", "broadcast_changes"),
    ("public", "broadcast_job_applications_changes"),
    ("public", "handle_expired_soft_deletes"),
    ("public", "log_new_job_application"),
    ("public", "log_stage_change"),
    ("public", "set_uns_updated_at"),
    ("public", "update_updated_at_column"),
}
REQUIRED_TABLE_GRANTS = {
    ("public", "user_account", "authenticated", "SELECT"),
    ("public", "user_account", "authenticated", "INSERT"),
    ("public", "app_events", "authenticated", "SELECT"),
    ("public", "user_notification_settings", "authenticated", "SELECT"),
    ("public", "user_notification_settings", "authenticated", "INSERT"),
    ("public", "user_notification_settings", "authenticated", "UPDATE"),
}
REQUIRED_TRIGGERS = {
    ("public", "job_applications", "job_applications_realtime_trigger"),
    ("public", "job_applications", "on_job_applications_update"),
    ("public", "job_applications", "trigger_log_new_job_application"),
    ("public", "job_applications", "trigger_log_stage_change"),
    ("public", "user_notification_settings", "set_uns_updated_at"),
}
REQUIRED_POLICIES = {
    ("public", "app_events", "Users can create their own job events."),
    ("public", "app_events", "Users can delete their own job events."),
    ("public", "app_events", "Users can update their own job events."),
    ("public", "app_events", "Users can view their own job events."),
    ("public", "job_applications", "Users can create their own job applications."),
    ("public", "job_applications", "Users can delete their own job applications."),
    ("public", "job_applications", "Users can update their own job applications."),
    ("public", "job_applications", "Users can view their own job applications."),
    ("public", "user_account", "user_parser_access"),
    ("public", "user_notification_settings", "uns_insert_self"),
    ("public", "user_notification_settings", "uns_read_self"),
    ("public", "user_notification_settings", "uns_update_self"),
}


def fetch_set(conn: psycopg.Connection, query: str) -> set[tuple[Any, ...]]:
    with conn.cursor() as cur:
        cur.execute(query)
        return {tuple(row) for row in cur.fetchall()}


def catalog_checks(conn: psycopg.Connection) -> dict[str, Any]:
    tables = fetch_set(
        conn,
        """
        select table_schema, table_name
        from information_schema.tables
        where table_schema in ('public', 'internal_staging')
          and table_type = 'BASE TABLE';
        """,
    )
    columns = fetch_set(
        conn,
        """
        select table_schema, table_name, column_name
        from information_schema.columns
        where table_schema in ('public', 'internal_staging');
        """,
    )
    sequences = fetch_set(
        conn,
        """
        select sequence_schema, sequence_name
        from information_schema.sequences
        where sequence_schema in ('public', 'internal_staging');
        """,
    )
    constraints = fetch_set(
        conn,
        """
        select n.nspname, c.relname, con.conname
        from pg_constraint con
        join pg_class c on c.oid = con.conrelid
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname in ('public', 'internal_staging');
        """,
    )
    indexes = fetch_set(
        conn,
        """
        select schemaname, tablename, indexname
        from pg_indexes
        where schemaname in ('public', 'internal_staging');
        """,
    )
    functions = fetch_set(
        conn,
        """
        select n.nspname, p.proname
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname in ('public', 'internal_staging');
        """,
    )
    triggers = fetch_set(
        conn,
        """
        select n.nspname, c.relname, t.tgname
        from pg_trigger t
        join pg_class c on c.oid = t.tgrelid
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname in ('public', 'internal_staging')
          and not t.tgisinternal;
        """,
    )
    policies = fetch_set(
        conn,
        """
        select schemaname, tablename, policyname
        from pg_policies
        where schemaname in ('public', 'internal_staging');
        """,
    )
    publications = fetch_set(
        conn,
        """
        select pubname, schemaname, tablename
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public';
        """,
    )
    rls_enabled = fetch_set(
        conn,
        """
        select n.nspname, c.relname
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relname in ('app_events', 'job_applications', 'user_account', 'user_notification_settings')
          and c.relrowsecurity;
        """,
    )
    table_grants = fetch_set(
        conn,
        """
        select table_schema, table_name, grantee, privilege_type
        from information_schema.table_privileges
        where table_schema in ('public', 'internal_staging')
          and grantee in ('anon', 'authenticated', 'service_role', 'postgres');
        """,
    )

    return {
        "missing_tables": sorted(REQUIRED_TABLES - tables),
        "missing_columns": sorted(REQUIRED_COLUMNS - columns),
        "missing_sequences": sorted(REQUIRED_SEQUENCES - sequences),
        "missing_constraints": sorted(REQUIRED_CONSTRAINTS - constraints),
        "missing_indexes": sorted(REQUIRED_INDEXES - indexes),
        "missing_functions": sorted(REQUIRED_FUNCTIONS - functions),
        "missing_triggers": sorted(REQUIRED_TRIGGERS - triggers),
        "missing_policies": sorted(REQUIRED_POLICIES - policies),
        "missing_table_grants": sorted(REQUIRED_TABLE_GRANTS - table_grants),
        "missing_rls_enabled": sorted(
            {
                ("public", "app_events"),
                ("public", "job_applications"),
                ("public", "user_account"),
                ("public", "user_notification_settings"),
            }
            - rls_enabled
        ),
        "missing_realtime_publication_tables": sorted(
            {
                ("supabase_realtime", "public", "app_events"),
                ("supabase_realtime", "public", "job_applications"),
            }
            - publications
        ),
    }


def synthetic_row_checks(conn: psycopg.Connection) -> dict[str, Any]:
    marker = f"migration-test-{uuid.uuid4()}"
    user_id = f"{marker}-user"
    provider_message_id = f"{marker}-message"
    staging_id = f"{marker}-staging"

    with conn.transaction():
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                insert into public.user_account (user_id, user_email, backend_rls_jwt)
                values (%s, %s, %s);
                """,
                (user_id, f"{marker}@example.invalid", "synthetic-jwt"),
            )
            cur.execute(
                """
                insert into public.user_notification_settings (user_uid)
                values (%s);
                """,
                (user_id,),
            )
            cur.execute(
                """
                insert into internal_staging.email_staging (
                    id, user_id_enc, trace_id, provider, provider_message_id,
                    subject_enc, sender_enc, received_at, body_enc
                )
                values (%s, %s, %s, %s, %s, %s, %s, %s, %s);
                """,
                (
                    staging_id,
                    "encrypted-user",
                    marker,
                    "gmail",
                    provider_message_id,
                    "encrypted-subject",
                    "encrypted-sender",
                    datetime.now(timezone.utc).isoformat(),
                    "encrypted-body",
                ),
            )
            cur.execute(
                """
                insert into public.job_applications (
                    user_uid, app_stage, received_at, provider_source, provider_message_id
                )
                values (%s, %s, %s, %s, %s)
                returning id, updated_at;
                """,
                (
                    user_id,
                    "staging",
                    datetime.now(timezone.utc).isoformat(),
                    "gmail",
                    provider_message_id,
                ),
            )
            job = cur.fetchone()
            job_id = job["id"]
            first_updated_at = job["updated_at"]

            cur.execute(
                """
                select count(*) as count
                from public.app_events
                where job_fk = %s and event_type = 'processed';
                """,
                (job_id,),
            )
            processed_count = cur.fetchone()["count"]

            cur.execute(
                """
                update public.job_applications
                set app_stage = 'interview'
                where id = %s
                returning updated_at;
                """,
                (job_id,),
            )
            second_updated_at = cur.fetchone()["updated_at"]

            cur.execute(
                """
                select count(*) as count
                from public.app_events
                where job_fk = %s and event_type = 'stage_change';
                """,
                (job_id,),
            )
            stage_change_count = cur.fetchone()["count"]

            cur.execute(
                "delete from internal_staging.email_staging where id = %s;",
                (staging_id,),
            )
            cur.execute("delete from public.user_account where user_id = %s;", (user_id,))

            cur.execute(
                """
                select
                    (select count(*) from public.user_account where user_id = %s) as users,
                    (select count(*) from public.job_applications where user_uid = %s) as jobs,
                    (select count(*) from public.app_events where user_uid = %s) as events,
                    (select count(*) from public.user_notification_settings where user_uid = %s) as settings,
                    (select count(*) from internal_staging.email_staging where id = %s) as staging;
                """,
                (user_id, user_id, user_id, user_id, staging_id),
            )
            cleanup = dict(cur.fetchone())

    return {
        "marker": marker,
        "processed_event_count": processed_count,
        "stage_change_event_count": stage_change_count,
        "updated_at_changed_or_equal": second_updated_at >= first_updated_at,
        "cleanup_counts": cleanup,
    }


def cleanup_counts(conn: psycopg.Connection) -> dict[str, int]:
    with conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            """
            select
                (select count(*) from public.user_account where user_id like 'migration-test-%') as users,
                (select count(*) from public.job_applications where user_uid like 'migration-test-%') as jobs,
                (select count(*) from public.app_events where user_uid like 'migration-test-%') as events,
                (select count(*) from public.user_notification_settings where user_uid like 'migration-test-%') as settings,
                (select count(*) from internal_staging.email_staging where id like 'migration-test-%') as staging;
            """
        )
        row = cur.fetchone()
        return {key: int(value) for key, value in dict(row).items()}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--url-key",
        default="NEW_CLIENT_DATABASE_URL",
        choices=["NEW_CLIENT_DATABASE_URL", "NEW_WORKER_DATABASE_URL"],
        help="Validation target URL key from .env.db_migration.",
    )
    args = parser.parse_args()

    env = require_migration_env()
    target_url = env[args.url_key]
    assert_not_runtime_database(target_url)

    report: dict[str, Any] = {
        "url_key": args.url_key,
        "catalog": {},
        "synthetic": {},
        "passed": False,
    }
    with psycopg.connect(target_url, connect_timeout=15) as conn:
        report["catalog"] = catalog_checks(conn)
        catalog_failures = {key: value for key, value in report["catalog"].items() if value}
        if catalog_failures:
            report["passed"] = False
        else:
            try:
                report["synthetic"] = synthetic_row_checks(conn)
                synthetic_cleanup_counts = report["synthetic"]["cleanup_counts"]
                report["passed"] = (
                    report["synthetic"]["processed_event_count"] >= 1
                    and report["synthetic"]["stage_change_event_count"] >= 1
                    and all(value == 0 for value in synthetic_cleanup_counts.values())
                )
            except Exception as exc:
                report["synthetic"] = {
                    "error": str(exc),
                    "traceback": traceback.format_exc(),
                    "cleanup_counts_after_rollback": cleanup_counts(conn),
                }
                report["passed"] = False

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(report, indent=2, default=str), encoding="utf-8")
    print(json.dumps(report, indent=2, default=str))
    if not report["passed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
