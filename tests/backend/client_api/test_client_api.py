"""Tests for the client_api domain.

Covers:
  - client_api.deps.auth
  - client_api.api.auth_api
  - client_api.api.jobs
  - client_api.api.dashboard
  - client_api.api.gmail (proxy endpoints)
  - client_api.main (lifespan, health endpoints)
  - client_api.services.supabase_client
  - client_api.services.firebase_admin
  - client_api.db.migration_env
  - client_api.db.export_current_schema
  - client_api.db.apply_baseline_to_new_supabase
"""
from __future__ import annotations

import importlib
import sys
import types
from collections import deque
from contextlib import asynccontextmanager
from datetime import date, datetime, timezone
from pathlib import Path

import httpx
import jwt
import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from client_api.api import auth_api
from client_api.api import dashboard, jobs
from client_api.db import apply_baseline_to_new_supabase as baseline
from client_api.db import export_current_schema as export_schema
from client_api.db import migration_env
from client_api.deps import auth as auth_deps
from client_api.services import firebase_admin, supabase_client
from common import security

from tests.conftest import AsyncConn, connection_context


# ---------------------------------------------------------------------------
# Shared test stubs
# ---------------------------------------------------------------------------

class AsyncAcquire:
    def __init__(self, conn):
        self.conn = conn

    async def __aenter__(self):
        return self.conn

    async def __aexit__(self, *_args):
        return None


class Pool:
    def __init__(self, conn):
        self.conn = conn

    def acquire(self):
        return AsyncAcquire(self.conn)


class Request:
    def __init__(self, *, pool=None, redis=None):
        self.app = types.SimpleNamespace(
            state=types.SimpleNamespace(pool=pool, redis=redis)
        )


class Redis:
    def __init__(self, value=None):
        self.value = value
        self.set_calls = []
        self.deleted = []

    async def get(self, key):
        return self.value

    async def delete(self, key):
        self.deleted.append(key)

    async def set(self, *args, **kwargs):
        self.set_calls.append((args, kwargs))


@asynccontextmanager
async def failing_connection():
    raise RuntimeError("database down")
    yield


# ---------------------------------------------------------------------------
# client_api.deps.auth
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_auth_dependencies(monkeypatch):
    monkeypatch.setattr(auth_deps, "verify_id_token", lambda token: {"uid": token})
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials="abc")
    assert await auth_deps.get_current_user(creds) == {"uid": "abc"}
    assert await auth_deps.get_user_from_token_query("query-token") == {"uid": "query-token"}

    with pytest.raises(HTTPException) as missing:
        await auth_deps.get_current_user(None)
    assert missing.value.status_code == 401

    monkeypatch.setattr(auth_deps, "verify_id_token", lambda _token: (_ for _ in ()).throw(RuntimeError("bad")))
    with pytest.raises(HTTPException) as invalid:
        await auth_deps.get_user_from_token_query("bad")
    assert invalid.value.status_code == 401

    with pytest.raises(HTTPException) as missing_query:
        await auth_deps.get_user_from_token_query("")
    assert missing_query.value.status_code == 401


# ---------------------------------------------------------------------------
# client_api.api.auth_api
# ---------------------------------------------------------------------------

def test_auth_api_mint_jwt_and_dispatch(monkeypatch):
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "unit-test-supabase-secret")
    monkeypatch.setattr(auth_api, "JWT_ALGORITHM", "HS256")
    token = auth_api.mint_jwt("user-123", exp=30)
    decoded = jwt.decode(token, "unit-test-supabase-secret", algorithms=["HS256"])
    assert decoded["sub"] == "user-123"
    assert decoded["role"] == "authenticated"
    assert decoded["exp"] > decoded["iat"]

    monkeypatch.delenv("SUPABASE_JWT_SECRET", raising=False)
    with pytest.raises(ValueError, match="SUPABASE_JWT_SECRET"):
        auth_api.mint_jwt("user-123")

    sent = {}
    monkeypatch.setattr(auth_api.celery_client, "send_task", lambda *args, **kwargs: sent.update({"args": args, "kwargs": kwargs}))
    auth_api.dispatch_initial_gmail_sync("user-123", "trace", datetime(2026, 1, 1))
    assert sent["kwargs"]["queue"] == "gmail_initial_sync_queue"


def test_auth_api_me_returns_user_info():
    assert auth_api.me({"uid": "u1", "email": "u@example.com"}) == {
        "uid": "u1",
        "email": "u@example.com",
    }


@pytest.mark.asyncio
async def test_auth_api_setup_and_gmail_status(monkeypatch):
    conn = AsyncConn(fetchrow=[None, {"gmail_connected": True}])
    request = Request(pool=Pool(conn), redis=Redis())
    monkeypatch.setattr(auth_api, "mint_jwt", lambda uid, exp=None: f"jwt:{uid}:{exp}")

    setup_result = await auth_api.setup_user_db(request, {"uid": "u1", "email": "u@example.com"})
    assert setup_result == {"status": "created", "user_id": "u1"}
    assert conn.execute_calls

    status_result = await auth_api.is_gmail_consent_provided(request, {"uid": "u1"})
    assert status_result == {"isConnected": True}

    missing_conn = AsyncConn(fetchrow=[None])
    with pytest.raises(HTTPException) as exc:
        await auth_api.is_gmail_consent_provided(Request(pool=Pool(missing_conn)), {"uid": "u1"})
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_auth_api_setup_rls_uses_existing_token(monkeypatch):
    conn = AsyncConn(fetchrow=[{"backend_rls_jwt": "existing"}])
    redis = Redis()
    request = Request(pool=Pool(conn), redis=redis)

    async def fake_phase_2_store_and_respond(_request, user_data, refresh_token, backend_jwt):
        return {"uid": user_data["uid"], "refresh_token": refresh_token, "backend_jwt": backend_jwt}

    monkeypatch.setattr(auth_api, "phase_2_store_and_respond", fake_phase_2_store_and_respond)
    result = await auth_api.setup_rls_session(
        request,
        {"uid": "u1", "email": "u@example.com"},
        auth_api.SetupRLSBody(daysToSync=7),
    )

    assert result["backend_jwt"] == "existing"
    assert redis.set_calls[0][0] == ("gmail_sync_window:u1", 7)


# ---------------------------------------------------------------------------
# client_api.api.jobs
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_jobs_endpoints_success_and_current_error_behavior(monkeypatch, user):
    encrypted_title = jobs.encrypt_job_application_value("Engineer")
    conn = AsyncConn(
        fetch=[
            [{"provider_message_id": "msg-1", "title_enc": encrypted_title}],
            [{"provider_message_id": "msg-1", "app_stage": "Interview"}],
            [],
        ],
        fetchrow=[{"provider_message_id": "created", "title_enc": encrypted_title}],
    )
    monkeypatch.setattr(jobs, "get_connection", lambda: connection_context(conn))
    monkeypatch.setattr(jobs.uuid, "uuid4", lambda: "uuid-1")

    created = await jobs.create_job_application(
        {"title": "Engineer", "salary": "100", "date": "2026-01-01"},
        user,
    )
    assert created["job_application"]["provider_message_id"] == "created"
    assert created["job_application"]["title"] == "Engineer"
    assert "title_enc" not in created["job_application"]
    assert conn.fetchrow_calls[0][1][3] == "Applied"

    updated = await jobs.update_job_application(
        {"provider_message_id": ["msg-1"], "job_title": "Engineer", "app_stage": "interview"},
        user,
    )
    assert updated["updated_jobs"][0]["title"] == "Engineer"
    assert "title_enc" not in updated["updated_jobs"][0]

    staged = await jobs.update_job_stage({"provider_message_ids": ["msg-1"], "app_stage": "interview"}, user)
    assert staged["updated"][0]["app_stage"] == "Interview"

    with pytest.raises(HTTPException) as missing_title:
        await jobs.create_job_application({}, user)
    assert missing_title.value.status_code == 400

    with pytest.raises(HTTPException) as missing_provider:
        await jobs.update_job_application({"title": "Engineer"}, user)
    assert missing_provider.value.status_code == 400

    with pytest.raises(HTTPException) as no_fields:
        await jobs.update_job_application({"provider_message_id": ["msg-1"]}, user)
    assert no_fields.value.status_code == 400


@pytest.mark.asyncio
async def test_jobs_collection_endpoints(monkeypatch, user):
    encrypted_title = jobs.encrypt_job_application_value("Loaded")
    conn = AsyncConn(
        fetch=[
            [{"provider_message_id": "r1", "needs_review": False}],
            [{"provider_message_id": "a1", "is_archived": True}],
            [{"provider_message_id": "d1", "is_deleted": True}],
            [{"provider_message_id": "latest", "title_enc": encrypted_title}],
            [{"provider_message_id": "trash", "title_enc": encrypted_title}],
            [{"provider_message_id": "archive", "title_enc": encrypted_title}],
            [{"provider_message_id": "delete-me"}],
        ],
        fetchrow=[{"provider_message_id": "snap-1"}],
    )
    monkeypatch.setattr(jobs, "get_connection", lambda: connection_context(conn))

    assert (await jobs.set_review_needed({"provider_message_ids": ["r1"], "needs_review": False}, user))["count"] == 1
    assert (await jobs.flip_archived_state({"provider_message_ids": ["a1"]}, user))["count"] == 1
    assert (await jobs.flip_deleted_state({"provider_message_ids": ["d1"]}, user))["count"] == 1
    latest = await jobs.get_latest_jobs(user)
    assert latest["jobs"][0]["title"] == "Loaded"
    assert (await jobs.get_trashed_jobs(user))["jobs"][0]["provider_message_id"] == "trash"
    assert (await jobs.get_archive(user))["jobs"][0]["provider_message_id"] == "archive"
    assert (await jobs.permanent_delete_jobs({"provider_message_ids": ["delete-me"], "confirm": True}, user))["deleted"] == ["delete-me"]
    assert (await jobs.snapshot_update_jobs({"jobs": [{"provider_message_id": "snap-1", "title": "T"}]}, user))["count"] == 1
    assert (await jobs.write_jobs_to_db({"jobs_to_update": []}, user)) == {"status": "success", "count": 0}


# ---------------------------------------------------------------------------
# client_api.api.dashboard
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_dashboard_endpoints(monkeypatch, user):
    today = date.today()
    conn = AsyncConn(
        fetch=[
            [{"app_stage": "Applied", "count": 2}, {"app_stage": "Rejected", "count": 9}],
            [{"id": "j1", "app_stage": "Applied", "received_at_ts": datetime(today.year, today.month, 1, tzinfo=timezone.utc)}],
            [{"job_fk": "j1", "stage": "Interview", "timestamp_utc": datetime(today.year, today.month, 2, tzinfo=timezone.utc)}],
            [{"id": "j1", "app_stage": "Applied", "received_at_ts": datetime(today.year, today.month, 1, tzinfo=timezone.utc)}],
            [{"job_fk": "j1", "stage": "Offer", "timestamp_utc": datetime(today.year, today.month, 2, tzinfo=timezone.utc)}],
            [{"week_start": today - dashboard.timedelta(days=today.weekday()), "count": 3}],
            [{"day": today, "app_count": 4}],
        ],
        fetchrow=[
            {"applied": 1.5, "interview": None, "offer": 0.0, "accepted": 2},
            {"apps": 5},
            {"cnt": 20},
            {"active_days": 10},
        ],
    )
    monkeypatch.setattr(dashboard, "get_connection", lambda: connection_context(conn))

    by_stage = await dashboard.apps_by_stage(user)
    assert by_stage["data"]["labels"] == ["Applied", "Interview", "Offer", "Accepted"]
    assert by_stage["data"]["values"] == [2, 0, 0, 0]

    monthly = await dashboard.split_by_stage_monthly(user)
    assert len(monthly["data"]["labels"]) == 4

    stages = await dashboard.stages_over_time(user)
    assert len(stages["data"]["labels"]) == 90

    averages = await dashboard.avg_time_in_stage(user)
    assert averages["data"]["interview"] == 0.0

    weekly = await dashboard.avg_apps_per_week(user)
    assert len(weekly["labels"]) == 12

    grit = await dashboard.grit_score(user)
    assert grit["score"] == 100

    heatmap = await dashboard.activity_heatmap(user)
    assert len(heatmap["data"]) == 84


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
async def test_dashboard_db_error_returns_500(monkeypatch, user, endpoint):
    monkeypatch.setattr(dashboard, "get_connection", failing_connection)
    with pytest.raises(HTTPException) as exc:
        await endpoint(user)
    assert exc.value.status_code == 500


# ---------------------------------------------------------------------------
# client_api.services.supabase_client
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_supabase_client_pool_paths(monkeypatch):
    monkeypatch.setattr(supabase_client, "DATABASE_URL", None)
    with pytest.raises(ValueError):
        await supabase_client.connect_to_db(max_retries=1, retry_delay=0)

    fake_pool = types.SimpleNamespace(acquired=[], closed=False)

    async def acquire():
        return "conn"

    async def release(conn):
        fake_pool.acquired.append(conn)

    async def close():
        fake_pool.closed = True

    fake_pool.acquire = acquire
    fake_pool.release = release
    fake_pool.close = close

    async def create_pool(*_args, **_kwargs):
        return fake_pool

    monkeypatch.setattr(supabase_client, "DATABASE_URL", "postgresql://db")
    monkeypatch.setattr(supabase_client.asyncpg, "create_pool", create_pool)
    assert await supabase_client.connect_to_db(max_retries=1, retry_delay=0) is fake_pool
    assert await supabase_client.check_db_pool_status() == {"status": "ok", "detail": "DB Pool Active"}

    async with supabase_client.get_connection() as conn:
        assert conn == "conn"
    assert fake_pool.acquired == ["conn"]

    monkeypatch.setattr(supabase_client, "db_pool", None)
    with pytest.raises(HTTPException) as exc:
        await supabase_client.check_db_pool_status()
    assert exc.value.status_code == 503

    with pytest.raises(HTTPException) as connection_exc:
        async with supabase_client.get_connection():
            pass
    assert connection_exc.value.status_code == 503


@pytest.mark.asyncio
async def test_supabase_client_retry_and_close_paths(monkeypatch):
    attempts = []

    async def refused_pool(*_args, **_kwargs):
        attempts.append("refused")
        raise ConnectionRefusedError("down")

    monkeypatch.setattr(supabase_client, "DATABASE_URL", "postgresql://db")
    monkeypatch.setattr(supabase_client.asyncpg, "create_pool", refused_pool)
    assert await supabase_client.connect_to_db(max_retries=1, retry_delay=0) is None
    assert attempts == ["refused"]

    pool = types.SimpleNamespace(closed=False)

    async def close():
        pool.closed = True

    pool.close = close
    monkeypatch.setattr(supabase_client, "db_pool", pool)
    await supabase_client.close_db_connection()
    assert pool.closed is True


@pytest.mark.asyncio
async def test_supabase_close_noop(monkeypatch):
    monkeypatch.setattr(supabase_client, "db_pool", None)
    await supabase_client.close_db_connection()


# ---------------------------------------------------------------------------
# client_api.services.firebase_admin
# ---------------------------------------------------------------------------

def test_firebase_admin_initialization_paths(monkeypatch, tmp_path):
    assert firebase_admin.get_auth() is firebase_admin.auth
    monkeypatch.setattr(firebase_admin.firebase_admin, "get_app", lambda: object())
    firebase_admin.initialize_firebase_sdk()

    monkeypatch.setattr(firebase_admin.firebase_admin, "get_app", lambda: (_ for _ in ()).throw(ValueError()))
    monkeypatch.delenv("GOOGLE_APPLICATION_CREDENTIALS", raising=False)
    monkeypatch.delenv("FIREBASE_SERVICE_ACCOUNT", raising=False)
    with pytest.raises(RuntimeError, match="not configured"):
        firebase_admin.initialize_firebase_sdk()

    monkeypatch.setenv("FIREBASE_SERVICE_ACCOUNT", "bad-json")
    with pytest.raises(RuntimeError, match="parse"):
        firebase_admin.initialize_firebase_sdk()

    certs = []
    initialized = []
    monkeypatch.setattr(firebase_admin.credentials, "Certificate", lambda value: certs.append(value) or value)
    monkeypatch.setattr(firebase_admin.firebase_admin, "initialize_app", lambda cred: initialized.append(cred))
    monkeypatch.setenv("FIREBASE_SERVICE_ACCOUNT", '{"project_id": "test"}')
    firebase_admin.initialize_firebase_sdk()
    assert initialized[-1] == {"project_id": "test"}

    cert_file = tmp_path / "firebase.json"
    cert_file.write_text("{}", encoding="utf-8")
    monkeypatch.setenv("GOOGLE_APPLICATION_CREDENTIALS", str(cert_file))
    firebase_admin.initialize_firebase_sdk()
    assert certs[-1] == str(cert_file)


@pytest.mark.asyncio
async def test_firebase_admin_health_check_paths(monkeypatch):
    monkeypatch.setattr(firebase_admin.firebase_admin, "_apps", {})
    with pytest.raises(RuntimeError, match="not initialized"):
        await firebase_admin.check_firebase_auth_health()

    monkeypatch.setattr(firebase_admin.firebase_admin, "_apps", {"default": object()})

    def user_not_found(*_args, **_kwargs):
        raise firebase_admin.auth.UserNotFoundError("missing", None)

    monkeypatch.setattr(firebase_admin.auth, "get_user", user_not_found)
    assert await firebase_admin.check_firebase_auth_health() is True

    monkeypatch.setattr(firebase_admin.auth, "get_user", lambda *_a, **_k: (_ for _ in ()).throw(RuntimeError("down")))
    assert await firebase_admin.check_firebase_auth_health() is False


# ---------------------------------------------------------------------------
# client_api.db.migration_env
# ---------------------------------------------------------------------------

def test_migration_env_ignores_non_assignments_and_reads_runtime_file(tmp_path, monkeypatch):
    env_file = tmp_path / ".env"
    env_file.write_text("\n# comment\nignored\nCLIENT_DATABASE_URL=postgresql://file\n", encoding="utf-8")
    assert migration_env.load_env_file(env_file) == {"CLIENT_DATABASE_URL": "postgresql://file"}

    monkeypatch.setattr(migration_env, "RUNTIME_ENV_FILE", env_file)
    monkeypatch.setenv("CLIENT_DATABASE_URL", "postgresql://fallback")
    assert migration_env.read_runtime_database_url() == "postgresql://file"


# ---------------------------------------------------------------------------
# client_api.db.export_current_schema
# ---------------------------------------------------------------------------

def test_export_schema_quote_helpers_escape_values():
    assert export_schema.qident('we"ird') == '"we""ird"'
    assert export_schema.qname("public", "job_applications") == '"public"."job_applications"'
    assert export_schema.sql_literal("Bob's job") == "'Bob''s job'"


def test_export_schema_collect_export_and_main(tmp_path, monkeypatch):
    getter_names = [
        "get_tables", "get_columns", "get_sequences", "get_constraints",
        "get_indexes", "get_functions", "get_triggers", "get_rules",
        "get_policies", "get_schema_grants", "get_table_grants",
        "get_function_grants", "get_publications", "get_extensions",
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


# ---------------------------------------------------------------------------
# client_api.db.apply_baseline_to_new_supabase
# ---------------------------------------------------------------------------

def test_apply_baseline_bootstrap_and_preflight():
    """Verify that apply_baseline_to_new_supabase has expected public API."""
    assert hasattr(baseline, "main")
    assert hasattr(baseline, "run_preflight")
    assert hasattr(baseline, "apply_migration")
    assert hasattr(baseline, "apply_sql_file")
    assert hasattr(baseline, "MIGRATION_PATH")
    assert hasattr(baseline, "CRITICAL_TABLES")
    assert hasattr(baseline, "fetch_existing_app_tables")
    assert "job_applications" in str(baseline.CRITICAL_TABLES)




# ---------------------------------------------------------------------------
# common.security (config reload — belongs in client_api domain test)
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# client_api.main — health and gmail proxy
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_main_gmail_and_health_helpers(monkeypatch):
    import fastapi

    resume_stub = types.ModuleType("client_api.api.resume")
    resume_stub.router = fastapi.APIRouter()
    monkeypatch.setitem(sys.modules, "client_api.api.resume", resume_stub)
    main = importlib.import_module("client_api.main")

    assert main.check_app_liveness()["status"] == "ok"
    assert main.alive_check().status_code == 200

    with pytest.raises(HTTPException) as missing_auth:
        await main.get_gmail_messages(authorization=None)
    assert missing_auth.value.status_code == 401

    class Response:
        def __init__(self, status_code, data=None):
            self.status_code = status_code
            self._data = data or {}
            self.text = "error"

        def json(self):
            return self._data

    class Client:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            return None

        async def get(self, *_args, **_kwargs):
            return Response(200, {"messages": [{"id": "m1"}]})

    monkeypatch.setattr(main.httpx, "AsyncClient", lambda: Client())
    assert await main.get_gmail_messages(authorization="Bearer token") == {"messages": [{"id": "m1"}]}
    assert await main.get_gmail_message("m1", authorization="Bearer token") == {"messages": [{"id": "m1"}]}

    async def check_db():
        return {"status": "ok"}

    async def check_auth():
        return True

    monkeypatch.setattr(main, "check_db_pool_status", check_db)
    monkeypatch.setattr(main, "check_firebase_auth_health", check_auth)
    assert (await main.db_alive_check()).status_code == 200
    assert (await main.auth_alive_check()).status_code == 200

# ---------------------------------------------------------------------------
# Extra Gmail API coverage
# ---------------------------------------------------------------------------

from client_api.api import gmail
from unittest.mock import MagicMock, AsyncMock

@pytest.mark.asyncio
async def test_is_missing_gmail_sync_column_error():
    assert gmail.is_missing_gmail_sync_column_error(Exception("gmail_watch_expiration does not exist")) is True
    assert gmail.is_missing_gmail_sync_column_error(Exception("something else")) is False

class MockAcquire:
    def __init__(self, conn):
        self.conn = conn
    async def __aenter__(self):
        return self.conn
    async def __aexit__(self, *args):
        pass

@pytest.mark.asyncio
async def test_sync_now_not_connected(monkeypatch):
    mock_conn = AsyncMock()
    mock_conn.fetchrow.return_value = {"gmail_connected": False}
    
    mock_pool = MagicMock()
    mock_pool.acquire.return_value = MockAcquire(mock_conn)
    
    mock_request = MagicMock()
    mock_request.app.state.pool = mock_pool
    
    user = {"uid": "user123"}
    res = await gmail.sync_now(mock_request, user)
    assert res["status"] == "skipped"

@pytest.mark.asyncio
async def test_sync_now_migration_required(monkeypatch):
    mock_conn = AsyncMock()
    mock_conn.fetchrow.return_value = {"gmail_connected": True}
    mock_conn.fetchval.side_effect = Exception("gmail_watch_expiration does not exist")
    
    mock_pool = MagicMock()
    mock_pool.acquire.return_value = MockAcquire(mock_conn)
    
    mock_request = MagicMock()
    mock_request.app.state.pool = mock_pool
    
    user = {"uid": "user123"}
    res = await gmail.sync_now(mock_request, user)
    assert res["status"] == "migration_required"

@pytest.mark.asyncio
async def test_sync_now_unexpected_error(monkeypatch):
    mock_conn = AsyncMock()
    mock_conn.fetchrow.return_value = {"gmail_connected": True}
    mock_conn.fetchval.side_effect = RuntimeError("boom")
    
    mock_pool = MagicMock()
    mock_pool.acquire.return_value = MockAcquire(mock_conn)
    
    mock_request = MagicMock()
    mock_request.app.state.pool = mock_pool
    
    user = {"uid": "user123"}
    with pytest.raises(RuntimeError, match="boom"):
        await gmail.sync_now(mock_request, user)

@pytest.mark.asyncio
async def test_sync_now_success(monkeypatch):
    mock_conn = AsyncMock()
    mock_conn.fetchrow.return_value = {"gmail_connected": True}
    now = datetime.now()
    mock_conn.fetchval.return_value = now
    
    mock_pool = MagicMock()
    mock_pool.acquire.return_value = MockAcquire(mock_conn)
    
    mock_request = MagicMock()
    mock_request.app.state.pool = mock_pool
    
    monkeypatch.setattr(gmail, "dispatch_gmail_catch_up", lambda uid, tid: None)
    
    user = {"uid": "user123"}
    res = await gmail.sync_now(mock_request, user)
    assert res["status"] == "queued"
    assert res["watch_expires_at"] == now.isoformat()

@pytest.mark.asyncio
async def test_sync_now_success_no_expiration(monkeypatch):
    mock_conn = AsyncMock()
    mock_conn.fetchrow.return_value = {"gmail_connected": True}
    mock_conn.fetchval.return_value = None
    
    mock_pool = MagicMock()
    mock_pool.acquire.return_value = MockAcquire(mock_conn)
    
    mock_request = MagicMock()
    mock_request.app.state.pool = mock_pool
    
    monkeypatch.setattr(gmail, "dispatch_gmail_catch_up", lambda uid, tid: None)
    
    user = {"uid": "user123"}
    res = await gmail.sync_now(mock_request, user)
    assert res["status"] == "queued"
    assert res["watch_expires_at"] is None

@pytest.mark.asyncio
async def test_dispatch_gmail_catch_up(monkeypatch):
    sent = []
    monkeypatch.setattr(gmail.celery_client, "send_task", lambda *args, **kwargs: sent.append((args, kwargs)))
    gmail.dispatch_gmail_catch_up("user123", "trace123")
    assert len(sent) == 1
    assert sent[0][0][0] == "gmail.catch_up_sync"
