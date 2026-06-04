from __future__ import annotations

import importlib
import json
import sys
import types
from datetime import date, datetime, timezone

import jwt
import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from tests.conftest import AsyncConn, connection_context


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


@pytest.mark.asyncio
async def test_auth_dependencies(monkeypatch):
    from client_api.deps import auth

    monkeypatch.setattr(auth, "verify_id_token", lambda token: {"uid": token})
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials="abc")
    assert await auth.get_current_user(creds) == {"uid": "abc"}
    assert await auth.get_user_from_token_query("query-token") == {"uid": "query-token"}

    with pytest.raises(HTTPException) as missing:
        await auth.get_current_user(None)
    assert missing.value.status_code == 401

    monkeypatch.setattr(auth, "verify_id_token", lambda _token: (_ for _ in ()).throw(RuntimeError("bad")))
    with pytest.raises(HTTPException) as invalid:
        await auth.get_user_from_token_query("bad")
    assert invalid.value.status_code == 401

    with pytest.raises(HTTPException) as missing_query:
        await auth.get_user_from_token_query("")
    assert missing_query.value.status_code == 401


def test_auth_api_mint_jwt_and_dispatch(monkeypatch):
    from client_api.api import auth_api

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


def test_auth_api_me_and_frontend_rls(monkeypatch):
    from client_api.api import auth_api

    assert auth_api.me({"uid": "u1", "email": "u@example.com"}) == {
        "uid": "u1",
        "email": "u@example.com",
    }


@pytest.mark.asyncio
async def test_auth_api_setup_and_status(monkeypatch):
    from client_api.api import auth_api

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
    from client_api.api import auth_api

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


@pytest.mark.asyncio
async def test_jobs_endpoints_success_and_current_error_behavior(monkeypatch, user):
    from client_api.api import jobs

    conn = AsyncConn(
        fetch=[
            [{"provider_message_id": "msg-1", "title": "Engineer"}],
            [{"provider_message_id": "msg-1", "app_stage": "Interview"}],
            [],
        ],
        fetchrow=[{"provider_message_id": "created", "title": "Engineer"}],
    )
    monkeypatch.setattr(jobs, "get_connection", lambda: connection_context(conn))
    monkeypatch.setattr(jobs.uuid, "uuid4", lambda: "uuid-1")

    created = await jobs.create_job_application(
        {"title": "Engineer", "salary": "100", "date": "2026-01-01"},
        user,
    )
    assert created["job_application"]["provider_message_id"] == "created"
    assert conn.fetchrow_calls[0][1][3] == "Applied"
    assert conn.fetchrow_calls[0][1][4] == 100.0

    updated = await jobs.update_job_application(
        {"provider_message_id": ["msg-1"], "job_title": "Engineer", "app_stage": "interview"},
        user,
    )
    assert updated["updated_jobs"][0]["title"] == "Engineer"
    assert conn.fetch_calls[0][1][-1] == user["uid"]

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

    with pytest.raises(HTTPException) as current_behavior:
        await jobs.update_job_stage({"provider_message_ids": ["missing"], "app_stage": "offer"}, user)
    assert current_behavior.value.status_code == 500


@pytest.mark.asyncio
async def test_jobs_collection_endpoints(monkeypatch, user):
    from client_api.api import jobs

    conn = AsyncConn(
        fetch=[
            [{"provider_message_id": "r1", "needs_review": False}],
            [{"provider_message_id": "a1", "is_archived": True}],
            [{"provider_message_id": "d1", "is_deleted": True}],
            [{"provider_message_id": "latest"}],
            [{"provider_message_id": "trash"}],
            [{"provider_message_id": "archive"}],
            [{"provider_message_id": "delete-me"}],
        ],
        fetchrow=[{"provider_message_id": "snap-1"}],
    )
    monkeypatch.setattr(jobs, "get_connection", lambda: connection_context(conn))

    assert (await jobs.set_review_needed({"provider_message_ids": ["r1"], "needs_review": False}, user))["count"] == 1
    assert (await jobs.flip_archived_state({"provider_message_ids": ["a1"]}, user))["count"] == 1
    assert (await jobs.flip_deleted_state({"provider_message_ids": ["d1"]}, user))["count"] == 1
    assert (await jobs.get_latest_jobs(user))["jobs"][0]["provider_message_id"] == "latest"
    assert (await jobs.get_trashed_jobs(user))["jobs"][0]["provider_message_id"] == "trash"
    assert (await jobs.get_archive(user))["jobs"][0]["provider_message_id"] == "archive"
    assert (await jobs.permanent_delete_jobs({"provider_message_ids": ["delete-me"], "confirm": True}, user))["deleted"] == ["delete-me"]
    assert (await jobs.snapshot_update_jobs({"jobs": [{"provider_message_id": "snap-1", "title": "T"}]}, user))["count"] == 1
    assert (await jobs.write_jobs_to_db({"jobs_to_update": []}, user)) == {"status": "success", "count": 0}
    assert (await jobs.write_jobs_to_db({"jobs_to_update": [{"id": "x", "title": "T"}, {"title": "skip"}]}, user)) == {"status": "success", "count": 2}

    with pytest.raises(HTTPException):
        await jobs.set_review_needed({"provider_message_ids": ["r1"]}, user)
    with pytest.raises(HTTPException):
        await jobs.flip_archived_state({}, user)
    with pytest.raises(HTTPException):
        await jobs.flip_deleted_state({}, user)
    with pytest.raises(HTTPException):
        await jobs.permanent_delete_jobs({"provider_message_ids": [], "confirm": True}, user)
    with pytest.raises(HTTPException):
        await jobs.permanent_delete_jobs({"provider_message_ids": ["x"], "confirm": False}, user)
    with pytest.raises(HTTPException):
        await jobs.snapshot_update_jobs({"jobs": "bad"}, user)
    with pytest.raises(HTTPException):
        await jobs.write_jobs_to_db({"jobs_to_update": "bad"}, user)


@pytest.mark.asyncio
async def test_dashboard_endpoints(monkeypatch, user):
    from client_api.api import dashboard

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
    assert set(monthly["data"]["stage_counts"]) == {"applied", "interview", "offer", "accepted"}

    stages = await dashboard.stages_over_time(user)
    assert len(stages["data"]["labels"]) == 90
    assert len(stages["data"]["stage_counts"]["offer"]) == 90

    averages = await dashboard.avg_time_in_stage(user)
    assert averages["data"]["interview"] == 0.0

    weekly = await dashboard.avg_apps_per_week(user)
    assert len(weekly["labels"]) == 12
    assert weekly["values"][-1] == 3

    grit = await dashboard.grit_score(user)
    assert grit["score"] == 100

    heatmap = await dashboard.activity_heatmap(user)
    assert len(heatmap["data"]) == 84
    assert any(item["v"] == 4 for item in heatmap["data"])


@pytest.mark.asyncio
async def test_supabase_client_pool_paths(monkeypatch):
    from client_api.services import supabase_client

    monkeypatch.setattr(supabase_client, "DATABASE_URL", None)
    with pytest.raises(ValueError):
        await supabase_client.connect_to_db(max_retries=1, retry_delay=0)

    fake_pool = types.SimpleNamespace(
        acquired=[],
        closed=False,
    )

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
    from client_api.services import supabase_client

    attempts = []

    async def refused_pool(*_args, **_kwargs):
        attempts.append("refused")
        raise ConnectionRefusedError("down")

    monkeypatch.setattr(supabase_client, "DATABASE_URL", "postgresql://db")
    monkeypatch.setattr(supabase_client.asyncpg, "create_pool", refused_pool)
    assert await supabase_client.connect_to_db(max_retries=1, retry_delay=0) is None
    assert attempts == ["refused"]

    async def invalid_password(*_args, **_kwargs):
        raise supabase_client.InvalidPasswordError("bad password")

    monkeypatch.setattr(supabase_client.asyncpg, "create_pool", invalid_password)
    with pytest.raises(supabase_client.InvalidPasswordError):
        await supabase_client.connect_to_db(max_retries=1, retry_delay=0)

    async def generic_failure(*_args, **_kwargs):
        raise RuntimeError("down")

    monkeypatch.setattr(supabase_client.asyncpg, "create_pool", generic_failure)
    assert await supabase_client.connect_to_db(max_retries=1, retry_delay=0) is None

    pool = types.SimpleNamespace(closed=False)

    async def close():
        pool.closed = True

    pool.close = close
    monkeypatch.setattr(supabase_client, "db_pool", pool)
    await supabase_client.close_db_connection()
    assert pool.closed is True


@pytest.mark.asyncio
async def test_firebase_admin_paths(monkeypatch):
    from client_api.services import firebase_admin

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
