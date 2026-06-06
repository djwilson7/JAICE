from __future__ import annotations

from contextlib import asynccontextmanager
import importlib
import sys
from pathlib import Path

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from classification import class_tasks
from client_api.api import dashboard, jobs
from client_api.db import apply_baseline_to_new_supabase as baseline
from client_api.db import export_current_schema as export_schema
from client_api.db import migration_env
from client_api.deps import auth as auth_deps
from client_api.services import firebase_admin
from client_api.services import supabase_client
from client_api.services.resume_chat import prompts
from common import security
from tests.conftest import AsyncConn, connection_context


def test_classification_decryption_none_text_and_unknown_label(monkeypatch):
    monkeypatch.setattr(class_tasks, "decrypt_token", lambda value: value.decode())
    decrypted = class_tasks.decrypt_email_content(
        "trace",
        [
            {
                "id": "good",
                "subject_enc": b"subject",
                "sender_enc": b"sender",
                "body_enc": b"body",
                "provider_message_id": "msg-good",
            },
            {"id": "bad"},
        ],
    )
    assert decrypted == [
        {
            "id": "good",
            "subject": "subject",
            "sender": "sender",
            "body": "body",
            "provider_message_id": "msg-good",
        }
    ]

    normalized = class_tasks.normalized_emails_for_model(
        "trace",
        [
            {
                "id": "none",
                "subject": None,
                "sender": None,
                "body": None,
                "provider_message_id": "msg-none",
            }
        ],
    )
    assert normalized[0]["subject"] == ""

    result = class_tasks.run_classification_model(
        "trace",
        [{"id": "unknown", "subject": "", "sender": "", "body": "", "provider_message_id": "msg"}],
    )
    assert result.applied == []
    assert result.retry == []
    assert result.not_job_related[0]["email_id"] == "unknown"


def test_security_import_configuration_failures(monkeypatch):
    key = "MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA="
    monkeypatch.delenv("FERNET_KEY", raising=False)
    with pytest.raises(ValueError, match="FERNET_KEY"):
        importlib.reload(security)

    monkeypatch.setenv("FERNET_KEY", "invalid")
    reloaded = importlib.reload(security)
    assert reloaded.f is None

    monkeypatch.setenv("FERNET_KEY", key)
    importlib.reload(security)


def test_migration_env_ignores_non_assignments_and_reads_runtime_file(tmp_path, monkeypatch):
    env_file = tmp_path / ".env"
    env_file.write_text("\n# comment\nignored\nCLIENT_DATABASE_URL=postgresql://file\n", encoding="utf-8")
    assert migration_env.load_env_file(env_file) == {"CLIENT_DATABASE_URL": "postgresql://file"}

    monkeypatch.setattr(migration_env, "RUNTIME_ENV_FILE", env_file)
    monkeypatch.setenv("CLIENT_DATABASE_URL", "postgresql://fallback")
    assert migration_env.read_runtime_database_url() == "postgresql://file"


def test_export_schema_collect_export_and_main(tmp_path, monkeypatch):
    getter_names = [
        "get_tables",
        "get_columns",
        "get_sequences",
        "get_constraints",
        "get_indexes",
        "get_functions",
        "get_triggers",
        "get_rules",
        "get_policies",
        "get_schema_grants",
        "get_table_grants",
        "get_function_grants",
        "get_publications",
        "get_extensions",
    ]
    for name in getter_names:
        monkeypatch.setattr(export_schema, name, lambda _conn, name=name: [{"getter": name}])
    snapshot = export_schema.collect_snapshot(object())
    assert snapshot["tables"] == [{"getter": "get_tables"}]
    assert snapshot["extensions"] == [{"getter": "get_extensions"}]

    rendered_snapshot = {
        "generated_at": "now",
        "extensions": [],
        "sequences": [],
        "columns": [{"schema_name": "public", "table_name": "jobs", "column_name": "id", "data_type": "integer", "identity_kind": None, "default_expr": None, "not_null": False}],
        "tables": [{"schema_name": "public", "table_name": "jobs", "comment": None, "rls_enabled": False, "rls_forced": False}],
        "constraints": [],
        "indexes": [],
        "rules": [],
        "functions": [],
        "triggers": [],
        "policies": [],
        "schema_grants": [],
        "table_grants": [],
        "function_grants": [],
        "publications": [],
    }

    class Conn:
        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return None

        def execute(self, sql):
            assert sql == "set default_transaction_read_only = on"

    monkeypatch.setattr(export_schema, "load_database_url", lambda: "postgresql://db")
    monkeypatch.setattr(export_schema.psycopg, "connect", lambda *_args, **_kwargs: Conn())
    monkeypatch.setattr(export_schema, "collect_snapshot", lambda _conn: rendered_snapshot)
    paths = export_schema.ExportPaths(
        schema_sql=tmp_path / "schema" / "schema.sql",
        migration_sql=tmp_path / "migrations" / "migration.sql",
        schema_map_md=tmp_path / "schema" / "map.md",
        audit_json=tmp_path / "schema" / "audit.json",
    )
    export_schema.export(paths)
    assert "create table" in paths.schema_sql.read_text(encoding="utf-8")
    assert "- None found in app-owned schemas." in paths.schema_map_md.read_text(encoding="utf-8")

    captured = []
    monkeypatch.setattr(export_schema, "export", lambda value: captured.append(value))
    monkeypatch.setattr(
        sys,
        "argv",
        [
            "export_schema",
            "--schema-sql",
            str(tmp_path / "one.sql"),
            "--migration-sql",
            str(tmp_path / "two.sql"),
            "--schema-map",
            str(tmp_path / "map.md"),
            "--audit-json",
            str(tmp_path / "audit.json"),
        ],
    )
    export_schema.main()
    assert captured[0].migration_sql == tmp_path / "two.sql"


@pytest.mark.asyncio
async def test_supabase_close_noop(monkeypatch):
    monkeypatch.setattr(supabase_client, "db_pool", None)
    await supabase_client.close_db_connection()


@asynccontextmanager
async def failing_connection():
    raise RuntimeError("database down")
    yield


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "endpoint",
    [
        dashboard.apps_by_stage,
        dashboard.split_by_stage_monthly,
        dashboard.stages_over_time,
        dashboard.avg_time_in_stage,
        dashboard.avg_apps_per_week,
        dashboard.grit_score,
        dashboard.activity_heatmap,
    ],
)
async def test_dashboard_endpoints_translate_database_errors(monkeypatch, user, endpoint):
    monkeypatch.setattr(dashboard, "get_connection", failing_connection)
    with pytest.raises(HTTPException) as exc:
        await endpoint(user)
    assert exc.value.status_code == 500


@pytest.mark.asyncio
async def test_dashboard_missing_average_row_and_timeline_edges(monkeypatch, user):
    today = dashboard.date.today()
    conn = AsyncConn(
        fetch=[
            [{"id": "missing-date", "app_stage": "Applied", "received_at_ts": None}],
            [{"job_fk": "missing-date", "stage": "Interview", "timestamp_utc": dashboard.datetime(today.year, today.month, 1, tzinfo=dashboard.timezone.utc)}],
            [{"id": "missing-date", "app_stage": "Applied", "received_at_ts": None}],
            [{"job_fk": "missing-date", "stage": "Offer", "timestamp_utc": dashboard.datetime.now(dashboard.timezone.utc)}],
        ],
        fetchrow=[None],
    )
    monkeypatch.setattr(dashboard, "get_connection", lambda: connection_context(conn))
    monthly = await dashboard.split_by_stage_monthly(user)
    assert monthly["status"] == "success"
    timeline = await dashboard.stages_over_time(user)
    assert timeline["status"] == "success"
    averages = await dashboard.avg_time_in_stage(user)
    assert averages["data"]["applied"] == 0.0


@pytest.mark.asyncio
async def test_jobs_optional_fields_and_database_errors(monkeypatch, user):
    conn = AsyncConn(fetch=[[{"provider_message_id": "msg"}]], fetchrow=[None])
    monkeypatch.setattr(jobs, "get_connection", lambda: connection_context(conn))
    updated = await jobs.update_job_application(
        {
            "provider_message_id": ["msg"],
            "job_title": "Title",
            "company_name": "Company",
            "app_stage": "offer",
            "salary": "100",
            "received_at": "2026-01-01",
            "notes": "note",
        },
        user,
    )
    assert updated["status"] == "success"

    with pytest.raises(HTTPException) as create_exc:
        await jobs.create_job_application({"title": "Title"}, user)
    assert create_exc.value.status_code == 500

    monkeypatch.setattr(jobs, "get_connection", failing_connection)
    calls = [
        (jobs.set_review_needed, {"provider_message_ids": ["msg"], "needs_review": True}),
        (jobs.get_latest_jobs, None),
        (jobs.flip_archived_state, {"provider_message_ids": ["msg"]}),
        (jobs.flip_deleted_state, {"provider_message_ids": ["msg"]}),
        (jobs.get_trashed_jobs, None),
        (jobs.get_archive, None),
        (jobs.permanent_delete_jobs, {"provider_message_ids": ["msg"], "confirm": True}),
        (jobs.snapshot_update_jobs, {"jobs": [{"provider_message_id": "msg"}]}),
        (jobs.write_jobs_to_db, {"jobs_to_update": [{"id": "msg"}]}),
    ]
    for endpoint, payload in calls:
        with pytest.raises(HTTPException) as exc:
            if payload is None:
                await endpoint(user)
            else:
                await endpoint(payload, user)
        assert exc.value.status_code == 500


def test_export_schema_getters_and_environment_url(monkeypatch):
    calls = []
    monkeypatch.setattr(
        export_schema,
        "fetch_all",
        lambda conn, query, params=(): calls.append((conn, query, params)) or [],
    )
    conn = object()
    getters = [
        export_schema.get_columns,
        export_schema.get_tables,
        export_schema.get_constraints,
        export_schema.get_sequences,
        export_schema.get_indexes,
        export_schema.get_functions,
        export_schema.get_triggers,
        export_schema.get_rules,
        export_schema.get_policies,
        export_schema.get_table_grants,
        export_schema.get_schema_grants,
        export_schema.get_function_grants,
        export_schema.get_publications,
        export_schema.get_extensions,
    ]
    for getter in getters:
        assert getter(conn) == []
    assert len(calls) == len(getters)

    monkeypatch.setattr(export_schema, "load_dotenv", None)
    monkeypatch.setenv("CLIENT_DATABASE_URL", "postgresql://environment")
    assert export_schema.load_database_url() == "postgresql://environment"


@pytest.mark.asyncio
async def test_invalid_bearer_token_and_existing_firebase_health_user(monkeypatch):
    monkeypatch.setattr(
        auth_deps,
        "verify_id_token",
        lambda _token: (_ for _ in ()).throw(ValueError("invalid")),
    )
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials="bad")
    with pytest.raises(HTTPException) as exc:
        await auth_deps.get_current_user(creds)
    assert exc.value.status_code == 401

    monkeypatch.setattr(firebase_admin.firebase_admin, "_apps", {"default": object()})
    monkeypatch.setattr(firebase_admin.auth, "get_user", lambda **_kwargs: object())
    assert await firebase_admin.check_firebase_auth_health() is True


def test_classification_llm_result_mapping_and_rule_offer():
    item = class_tasks.build_llm_result_item(
        {"id": "row", "provider_message_id": "msg"},
        {
            "category": "INTERVIEW",
            "confidence": 0.9,
            "secondary_category": "APPLICATION_RECEIVED",
            "secondary_confidence": 0.2,
            "reason": "interview_request",
        },
    )
    assert item["top_label"] == "interview"
    assert item["second_label"] == "applied"

    assert class_tasks.build_llm_result_item(
        {"id": "row", "provider_message_id": "msg"},
        {
            "category": "INTERVIEW",
            "confidence": 0.62,
            "secondary_category": "APPLICATION_RECEIVED",
            "secondary_confidence": 0.2,
        },
    ) is None

    result = class_tasks.run_classification_model(
        "trace",
        [
            {
                "id": "offer",
                "subject": "offer letter",
                "sender": "company",
                "body": "pleased to offer employment offer compensation",
                "provider_message_id": "msg-offer",
            }
        ],
    )
    assert result.offer[0]["top_label"] == "offer"


def test_migration_identity_exit_baseline_bootstrap_and_main(tmp_path, monkeypatch):
    runtime = tmp_path / ".env"
    runtime.write_text("CLIENT_DATABASE_URL=postgresql://runtime/db\n", encoding="utf-8")
    monkeypatch.setattr(migration_env, "RUNTIME_ENV_FILE", runtime)
    migration_env.assert_not_runtime_database("postgresql://target/db")

    root = str(baseline.ROOT)
    original_path = list(sys.path)
    try:
        sys.path[:] = [item for item in sys.path if item != root]
        importlib.reload(baseline)
        assert sys.path[0] == root
    finally:
        sys.path[:] = original_path

    migration = tmp_path / "baseline.sql"
    migration.write_text("select 1;", encoding="utf-8")
    sql_file = tmp_path / "extra.sql"
    sql_file.write_text("select 2;", encoding="utf-8")

    class Result:
        def fetchone(self):
            return ("database", "user")

    class Cursor:
        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return None

        def execute(self, _query):
            return None

        def fetchall(self):
            return []

    class Conn:
        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return None

        def cursor(self):
            return Cursor()

        def execute(self, _query):
            return Result()

    applied = []
    monkeypatch.setattr(baseline, "MIGRATION_PATH", migration)
    monkeypatch.setattr(
        baseline,
        "require_migration_env",
        lambda: {"NEW_CLIENT_DATABASE_URL": "postgresql://target/db"},
    )
    monkeypatch.setattr(baseline, "assert_not_runtime_database", lambda _url: None)
    monkeypatch.setattr(baseline.psycopg, "connect", lambda *_args, **_kwargs: Conn())
    monkeypatch.setattr(baseline, "apply_migration", lambda conn: applied.append(conn))
    monkeypatch.setattr(baseline, "apply_sql_file", lambda conn, path: applied.append((conn, path)))

    monkeypatch.setattr(sys, "argv", ["baseline", "--preflight-only"])
    baseline.main()
    monkeypatch.setattr(sys, "argv", ["baseline", "--apply", "--apply-file", str(sql_file)])
    baseline.main()
    monkeypatch.setattr(sys, "argv", ["baseline", "--apply"])
    baseline.main()
    monkeypatch.setattr(sys, "argv", ["baseline", "--apply-file", str(sql_file)])
    baseline.main()
    assert len(applied) == 4


def test_prompt_sparse_sections():
    assert (
        prompts.resume_context_to_text({"skills": [{"category": "", "items": []}]})
        == "No resume content was provided."
    )
    assert (
        prompts.resume_context_to_text(
            {"education": [{"school": "", "degree": "", "details": []}]}
        )
        == "No resume content was provided."
    )

@pytest.mark.asyncio
async def test_dashboard_full_timeline_edges(monkeypatch, user):
    now = dashboard.datetime.now(dashboard.timezone.utc)
    old = now - dashboard.timedelta(days=200)
    future = now + dashboard.timedelta(days=1)
    job_rows = [
        {"id": "no-events", "app_stage": "Mystery", "received_at_ts": old},
        {"id": "event-created", "app_stage": "Applied", "received_at_ts": None},
        {"id": "earlier-event", "app_stage": "Offer", "received_at_ts": now},
        {"id": "future-event", "app_stage": "Interview", "received_at_ts": old},
    ]
    event_rows = [
        {"job_fk": "event-created", "stage": "Interview", "timestamp_utc": old},
        {"job_fk": "event-created", "stage": "Offer", "timestamp_utc": future},
        {"job_fk": "earlier-event", "stage": "Applied", "timestamp_utc": old},
        {"job_fk": "future-event", "stage": "Accepted", "timestamp_utc": future},
    ]
    conn = AsyncConn(fetch=[job_rows, event_rows, job_rows, event_rows])
    monkeypatch.setattr(dashboard, "get_connection", lambda: connection_context(conn))
    assert (await dashboard.split_by_stage_monthly(user))["status"] == "success"
    assert (await dashboard.stages_over_time(user))["status"] == "success"


@pytest.mark.asyncio
async def test_jobs_not_found_and_snapshot_edges(monkeypatch, user):
    conn = AsyncConn(fetch=[[], []], fetchrow=[None])
    monkeypatch.setattr(jobs, "get_connection", lambda: connection_context(conn))

    with pytest.raises(HTTPException) as update_exc:
        await jobs.update_job_application(
            {"provider_message_id": ["missing"], "job_title": "Title"},
            user,
        )
    assert update_exc.value.status_code == 500

    with pytest.raises(HTTPException) as stage_exc:
        await jobs.update_job_stage({}, user)
    assert stage_exc.value.status_code == 400

    with pytest.raises(HTTPException) as delete_exc:
        await jobs.permanent_delete_jobs(
            {"provider_message_ids": ["missing"], "confirm": True},
            user,
        )
    assert delete_exc.value.status_code == 500

    with pytest.raises(HTTPException) as snapshot_exc:
        await jobs.snapshot_update_jobs({"jobs": [{}]}, user)
    assert snapshot_exc.value.status_code == 500

    snapshot = await jobs.snapshot_update_jobs(
        {"jobs": [{"provider_message_id": "missing"}]},
        user,
    )
    assert snapshot["count"] == 0
