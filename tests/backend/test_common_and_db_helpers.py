from __future__ import annotations

from pathlib import Path

import pytest

from client_api.db import apply_baseline_to_new_supabase as baseline
from client_api.db import export_current_schema as export_schema
from client_api.db import migration_env
from common import logger as logger_module
from common import security
from shared_worker_library.utils import to_bytes
from shared_worker_library.utils.task_definitions import (
    ClassificationModelResult,
    EmailStage,
    EmailStatus,
    RelevanceModelResult,
    TaskType,
)


def test_security_roundtrip_and_invalid_inputs():
    encrypted = security.encrypt_token("refresh-token")
    assert security.decrypt_token(encrypted) == "refresh-token"
    assert security.decrypt_token(encrypted.decode("utf-8")) == "refresh-token"

    with pytest.raises(ValueError, match="cannot be None"):
        security.decrypt_token(None)


def test_logger_reuses_existing_handler():
    log = logger_module.get_logger("unit-test-logger")
    initial_handlers = list(log.handlers)

    same_log = logger_module.get_logger("unit-test-logger")

    assert same_log is log
    assert same_log.handlers == initial_handlers
    assert same_log.propagate is False


def test_to_bytes_converts_memoryview_and_postgres_hex():
    assert to_bytes.to_bytes(memoryview(b"abc")) == b"abc"
    assert to_bytes.to_bytes("\\x616263") == b"abc"
    assert to_bytes.to_bytes(b"raw") == b"raw"
    assert to_bytes.to_bytes(None) is None


def test_task_definitions_expose_expected_metadata():
    assert TaskType.INITIAL_SYNC.task_name == "gmail.initial_sync"
    assert TaskType.CLASSIFICATION_MODEL.queue_name == "classification_model_queue"
    assert EmailStatus.AWAIT_RELEVANCE.value == "AWAIT_RELEVANCE"
    assert EmailStage.INTERVIEW.value == "Interview"

    relevance = RelevanceModelResult(relevant={"1": 0.9}, retry=["2"], purge=["3"])
    classification = ClassificationModelResult(
        applied=[{"id": 1}],
        interview=[],
        offer=[],
        accepted=[],
        rejected=[],
        retry=[],
    )

    assert relevance.relevant["1"] == 0.9
    assert classification.applied[0]["id"] == 1


def test_export_schema_quote_helpers_escape_values():
    assert export_schema.qident('we"ird') == '"we""ird"'
    assert export_schema.qname("public", "job_applications") == '"public"."job_applications"'
    assert export_schema.sql_literal("Bob's job") == "'Bob''s job'"


def test_export_schema_build_create_table_and_policy():
    table = {"schema_name": "public", "table_name": "job_applications", "comment": None}
    columns = [
        {
            "column_name": "id",
            "data_type": "integer",
            "identity_kind": "always",
            "default_expr": None,
            "not_null": True,
        },
        {
            "column_name": "title",
            "data_type": "text",
            "identity_kind": None,
            "default_expr": "'Untitled'::text",
            "not_null": False,
        },
    ]
    create_sql = export_schema.build_create_table(table, columns)

    assert 'generated always as identity' in create_sql
    assert "default 'Untitled'::text" in create_sql
    assert '"public"."job_applications"' in create_sql

    policy_sql = export_schema.build_policy(
        {
            "policyname": "owner",
            "schema_name": "public",
            "table_name": "job_applications",
            "permissive": "PERMISSIVE",
            "cmd": "SELECT",
            "roles": ["authenticated"],
            "qual": "user_uid = auth.uid()",
            "with_check": "user_uid = auth.uid()",
        }
    )
    assert "to authenticated" in policy_sql
    assert "using (user_uid = auth.uid())" in policy_sql
    assert "with check (user_uid = auth.uid())" in policy_sql

    public_policy = export_schema.build_policy(
        {
            "policyname": "read_all",
            "schema_name": "public",
            "table_name": "job_applications",
            "permissive": "PERMISSIVE",
            "cmd": "SELECT",
            "roles": [],
            "qual": None,
            "with_check": None,
        }
    )
    assert "to public;" in public_policy


def _snapshot() -> dict:
    return {
        "generated_at": "2026-06-02T00:00:00+00:00",
        "extensions": [{"extname": "pgcrypto", "schema_name": "public", "extversion": "1.0"}],
        "sequences": [],
        "columns": [
            {
                "schema_name": "public",
                "table_name": "job_applications",
                "column_name": "id",
                "data_type": "integer",
                "identity_kind": None,
                "default_expr": None,
                "not_null": True,
            }
        ],
        "tables": [
            {
                "schema_name": "public",
                "table_name": "job_applications",
                "comment": "Jobs",
                "rls_enabled": True,
                "rls_forced": False,
            }
        ],
        "constraints": [{"schema_name": "public", "table_name": "job_applications", "constraint_name": "pk_jobs", "definition": "PRIMARY KEY (id)"}],
        "indexes": [
            {"schema_name": "public", "table_name": "job_applications", "indexname": "pk_jobs", "indexdef": "create unique index pk_jobs on public.job_applications(id)"},
            {"schema_name": "public", "table_name": "job_applications", "indexname": "idx_jobs_title", "indexdef": "create index idx_jobs_title on public.job_applications(title)"},
        ],
        "rules": [],
        "functions": [{"schema_name": "public", "function_name": "bad_fn", "identity_args": "", "definition": "select * from internal_staing.email_staging"}],
        "triggers": [],
        "policies": [],
        "schema_grants": [{"schema_name": "public", "grantee": "authenticated", "privilege_type": "USAGE"}],
        "table_grants": [{"schema_name": "public", "table_name": "job_applications", "grantee": "authenticated", "privilege_type": "SELECT"}],
        "function_grants": [],
        "publications": [],
    }


def test_export_schema_renderers_cover_major_sections():
    sql = export_schema.render_schema_sql(_snapshot())
    md = export_schema.render_map_md(_snapshot())

    assert "-- extension: pgcrypto" in sql
    assert "comment on table" in sql
    assert "idx_jobs_title" in sql
    assert "pk_jobs on public" not in sql
    assert "enable row level security" in sql
    assert "grant USAGE on schema" in sql
    assert "-- no app-owned tables found" in sql
    assert "`public.job_applications`: present" in md
    assert "references `internal_staing`" in md


def test_migration_env_reads_and_validates_files(tmp_path, monkeypatch):
    env_file = tmp_path / ".env.db_migration"
    env_file.write_text(
        "\n".join(
            [
                "NEW_SUPABASE_URL=url",
                "NEW_SUPABASE_ANON_KEY=anon",
                "NEW_SUPABASE_JWT_SECRET=secret",
                "NEW_CLIENT_DATABASE_URL=postgresql://u:p@host:5432/newdb",
                "NEW_WORKER_DATABASE_URL='postgresql://u:p@host:5432/workerdb'",
            ]
        ),
        encoding="utf-8",
    )
    monkeypatch.setattr(migration_env, "ENV_FILE", env_file)

    loaded = migration_env.require_migration_env()

    assert loaded["NEW_WORKER_DATABASE_URL"] == "postgresql://u:p@host:5432/workerdb"
    assert migration_env.normalized_database_identity("postgresql://u:p@host:5432/db") == (
        "host",
        5432,
        "u",
        "db",
    )


def test_migration_env_rejects_missing_and_runtime_database(tmp_path, monkeypatch):
    env_file = tmp_path / ".env.db_migration"
    env_file.write_text("NEW_SUPABASE_URL=PLACEHOLDER\n", encoding="utf-8")
    monkeypatch.setattr(migration_env, "ENV_FILE", env_file)

    with pytest.raises(RuntimeError, match="not ready"):
        migration_env.require_migration_env()

    runtime_file = tmp_path / ".env"
    runtime_file.write_text("CLIENT_DATABASE_URL=postgresql://u:p@host:5432/db\n", encoding="utf-8")
    monkeypatch.setattr(migration_env, "RUNTIME_ENV_FILE", runtime_file)

    with pytest.raises(RuntimeError, match="exactly matches"):
        migration_env.assert_not_runtime_database("postgresql://u:p@host:5432/db")
    with pytest.raises(RuntimeError, match="same database identity"):
        migration_env.assert_not_runtime_database("postgresql://u:other@host:5432/db")


class _Cursor:
    def __init__(self, rows):
        self.rows = rows
        self.queries = []

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return None

    def execute(self, query):
        self.queries.append(query)

    def fetchall(self):
        return self.rows


class _Transaction:
    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return None


class _Conn:
    def __init__(self, rows=()):
        self.rows = rows
        self.executed = []

    def cursor(self):
        return _Cursor(self.rows)

    def transaction(self):
        return _Transaction()

    def execute(self, sql):
        self.executed.append(sql)


def test_baseline_preflight_and_sql_application(tmp_path, monkeypatch):
    conn = _Conn(rows=[("public", "job_applications"), ("public", "other")])

    with pytest.raises(RuntimeError, match="critical app tables"):
        baseline.run_preflight(conn, allow_existing=False)
    assert baseline.run_preflight(conn, allow_existing=True) == [
        ("public", "job_applications"),
        ("public", "other"),
    ]

    bad_sql = tmp_path / "bad.sql"
    bad_sql.write_text("select * from internal_staing.email_staging", encoding="utf-8")
    with pytest.raises(RuntimeError, match="internal_staing"):
        baseline.apply_sql_file(conn, bad_sql)

    good_sql = tmp_path / "good.sql"
    good_sql.write_text("select 1", encoding="utf-8")
    baseline.apply_sql_file(conn, good_sql)
    assert conn.executed == ["select 1"]
