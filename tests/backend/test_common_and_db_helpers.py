from __future__ import annotations

import sys
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


def test_security_rejects_operations_when_fernet_is_unavailable(monkeypatch):
    monkeypatch.setattr(security, "f", None)

    with pytest.raises(ValueError, match="Encryption is unavailable"):
        security.encrypt_token("refresh-token")
    with pytest.raises(ValueError, match="Decryption is unavailable"):
        security.decrypt_token(b"refresh-token")


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


def test_export_schema_renderers_cover_optional_sections():
    snapshot = _snapshot()
    snapshot["sequences"] = [
        {
            "schema_name": "public",
            "sequence_name": "job_id_seq",
            "data_type": "bigint",
            "increment": 1,
            "minimum_value": 1,
            "maximum_value": 100,
            "start_value": 1,
        }
    ]
    snapshot["rules"] = [{"definition": "create rule rule_one as on insert to public.job_applications do nothing"}]
    snapshot["triggers"] = [
        {
            "schema_name": "public",
            "table_name": "job_applications",
            "trigger_name": "trigger_one",
            "definition": "create trigger trigger_one before insert on public.job_applications execute function public.bad_fn()",
        }
    ]
    snapshot["policies"] = [
        {
            "policyname": "owner",
            "schema_name": "public",
            "table_name": "job_applications",
            "permissive": "PERMISSIVE",
            "cmd": "SELECT",
            "roles": ["authenticated"],
            "qual": None,
            "with_check": None,
        }
    ]
    snapshot["function_grants"] = [
        {
            "schema_name": "public",
            "routine_name": "bad_fn",
            "grantee": "authenticated",
            "privilege_type": "EXECUTE",
        }
    ]
    snapshot["publications"] = [
        {
            "pubname": "realtime",
            "schema_name": "public",
            "table_name": "job_applications",
        }
    ]
    snapshot["tables"][0]["rls_forced"] = True

    sql = export_schema.render_schema_sql(snapshot)
    md = export_schema.render_map_md(snapshot)

    assert "create sequence if not exists" in sql
    assert "create rule rule_one" in sql
    assert "create trigger trigger_one" in sql
    assert "force row level security" in sql
    assert "routine grant observed" in sql
    assert "-- publication realtime includes" in sql
    assert "`public.job_applications` -> `trigger_one`" in md
    assert "`owner` (SELECT)" in md
    assert "`realtime` includes `public.job_applications`" in md


def test_export_schema_database_helpers(monkeypatch):
    class Cursor:
        def __init__(self):
            self.executed = []

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return None

        def execute(self, query, params):
            self.executed.append((query, params))

        def fetchall(self):
            return [{"id": 1}]

    cursor = Cursor()
    conn = type("Conn", (), {"cursor": lambda self, **_kwargs: cursor})()
    assert export_schema.fetch_all(conn, "select 1", ["arg"]) == [{"id": 1}]
    assert cursor.executed == [("select 1", ("arg",))]

    monkeypatch.setattr(export_schema, "load_dotenv", lambda: None)
    monkeypatch.delenv("CLIENT_DATABASE_URL", raising=False)
    with pytest.raises(RuntimeError, match="CLIENT_DATABASE_URL"):
        export_schema.load_database_url()
    monkeypatch.setenv("CLIENT_DATABASE_URL", "postgresql://db")
    assert export_schema.load_database_url() == "postgresql://db"


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


def test_migration_env_fallbacks_and_noop(tmp_path, monkeypatch):
    monkeypatch.setattr(migration_env, "ENV_FILE", tmp_path / "missing-migration-env")
    with pytest.raises(RuntimeError, match="does not exist"):
        migration_env.require_migration_env()

    monkeypatch.setattr(migration_env, "RUNTIME_ENV_FILE", tmp_path / "missing-runtime-env")
    monkeypatch.setenv("CLIENT_DATABASE_URL", "postgresql://runtime")
    assert migration_env.read_runtime_database_url() == "postgresql://runtime"

    monkeypatch.delenv("CLIENT_DATABASE_URL")
    migration_env.assert_not_runtime_database("postgresql://target")


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


def test_baseline_migration_and_main_paths(tmp_path, monkeypatch, capsys):
    bad_migration = tmp_path / "bad.sql"
    bad_migration.write_text("select * from internal_staing.email_staging", encoding="utf-8")
    monkeypatch.setattr(baseline, "MIGRATION_PATH", bad_migration)
    with pytest.raises(RuntimeError, match="internal_staing"):
        baseline.apply_migration(_Conn())

    good_migration = tmp_path / "good.sql"
    good_migration.write_text("select 1", encoding="utf-8")
    monkeypatch.setattr(baseline, "MIGRATION_PATH", good_migration)
    conn = _Conn()
    baseline.apply_migration(conn)
    assert conn.executed == ["select 1"]

    monkeypatch.setattr(sys, "argv", ["apply_baseline"])
    with pytest.raises(SystemExit, match="Choose"):
        baseline.main()

    monkeypatch.setattr(baseline, "require_migration_env", lambda: {"NEW_CLIENT_DATABASE_URL": "postgresql://target"})
    monkeypatch.setattr(baseline, "assert_not_runtime_database", lambda _url: None)
    monkeypatch.setattr(baseline, "MIGRATION_PATH", tmp_path / "missing.sql")
    monkeypatch.setattr(sys, "argv", ["apply_baseline", "--preflight-only"])
    with pytest.raises(RuntimeError, match="Missing migration file"):
        baseline.main()

    class MainConn(_Conn):
        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return None

        def execute(self, sql):
            if sql == "select current_database(), current_user":
                return type("Result", (), {"fetchone": lambda self: ("database", "user")})()
            return super().execute(sql)

    main_conn = MainConn()
    monkeypatch.setattr(baseline, "MIGRATION_PATH", good_migration)
    monkeypatch.setattr(baseline.psycopg, "connect", lambda *_args, **_kwargs: main_conn)
    monkeypatch.setattr(sys, "argv", ["apply_baseline", "--apply", "--apply-file", str(good_migration)])
    baseline.main()

    output = capsys.readouterr().out
    assert "'connected': True" in output
    assert output.count("'migration_applied': True") == 2
