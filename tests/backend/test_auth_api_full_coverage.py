from __future__ import annotations

import types
from collections import deque
from datetime import datetime

import httpx
import pytest
from fastapi import HTTPException

from client_api.api import auth_api


class Conn:
    def __init__(
        self,
        *,
        fetchrow=(),
        fetch=(),
        execute_error: Exception | None = None,
    ):
        self.fetchrow_results = deque(fetchrow)
        self.fetch_results = deque(fetch)
        self.execute_error = execute_error
        self.fetchrow_calls = []
        self.fetch_calls = []
        self.execute_calls = []

    async def fetchrow(self, query, *args):
        self.fetchrow_calls.append((query, args))
        result = self.fetchrow_results.popleft() if self.fetchrow_results else None
        if isinstance(result, Exception):
            raise result
        return result

    async def fetch(self, query, *args):
        self.fetch_calls.append((query, args))
        result = self.fetch_results.popleft() if self.fetch_results else []
        if isinstance(result, Exception):
            raise result
        return result

    async def execute(self, query, *args):
        self.execute_calls.append((query, args))
        if self.execute_error:
            raise self.execute_error
        return "OK"


class Acquire:
    def __init__(self, conn):
        self.conn = conn

    async def __aenter__(self):
        if isinstance(self.conn, Exception):
            raise self.conn
        return self.conn

    async def __aexit__(self, *_args):
        return None


class Pool:
    def __init__(self, *connections):
        self.connections = deque(connections)

    def acquire(self):
        return Acquire(self.connections.popleft())


class Redis:
    def __init__(self, value=None):
        self.value = value
        self.deleted = []
        self.set_calls = []

    async def get(self, key):
        return self.value

    async def delete(self, key):
        self.deleted.append(key)

    async def set(self, *args, **kwargs):
        self.set_calls.append((args, kwargs))


def request(*, pool=None, redis=None):
    return types.SimpleNamespace(
        app=types.SimpleNamespace(state=types.SimpleNamespace(pool=pool, redis=redis))
    )


class Flow:
    def __init__(
        self,
        *,
        auth_url="http://google.test/authorize",
        refresh_token="refresh-token",
        fetch_error: Exception | None = None,
    ):
        self.auth_url = auth_url
        self.credentials = types.SimpleNamespace(refresh_token=refresh_token)
        self.fetch_error = fetch_error
        self.authorization_calls = []
        self.fetch_calls = []

    def authorization_url(self, **kwargs):
        self.authorization_calls.append(kwargs)
        return self.auth_url, "state"

    def fetch_token(self, **kwargs):
        self.fetch_calls.append(kwargs)
        if self.fetch_error:
            raise self.fetch_error


def install_flow(monkeypatch, flow):
    monkeypatch.setattr(
        auth_api.Flow,
        "from_client_config",
        lambda *_args, **_kwargs: flow,
    )


def test_oauth_consent_url_success_and_configuration_errors(monkeypatch):
    flow = Flow()
    install_flow(monkeypatch, flow)

    response = auth_api.get_oauth_consent_url({"uid": "u1"})
    assert response.headers["location"] == "http://google.test/authorize"
    assert flow.authorization_calls == [
        {"access_type": "offline", "state": "u1", "prompt": "consent"}
    ]

    monkeypatch.setattr(auth_api, "CLIENT_SECRETS_FILE", None)
    with pytest.raises(ValueError, match="CLIENT_SECRETS"):
        auth_api.get_oauth_consent_url({"uid": "u1"})

    monkeypatch.setattr(auth_api, "CLIENT_SECRETS_FILE", '{"web": {}}')
    monkeypatch.setattr(auth_api, "BASE_URL", None)
    with pytest.raises(ValueError, match="BASE_URL"):
        auth_api.get_oauth_consent_url({"uid": "u1"})


@pytest.mark.asyncio
@pytest.mark.parametrize("redis_value", [None, "none", "invalid", "5"])
async def test_oauth_callback_success_for_sync_window_values(
    monkeypatch, redis_value
):
    flow = Flow()
    install_flow(monkeypatch, flow)
    conn = Conn()
    redis = Redis(redis_value)
    dispatched = []
    monkeypatch.setattr(auth_api, "encrypt_token", lambda token: f"enc:{token}")
    monkeypatch.setattr(
        auth_api,
        "dispatch_initial_gmail_sync",
        lambda *args: dispatched.append(args),
    )
    monkeypatch.setattr(
        auth_api,
        "dispatch_gmail_watch_setup",
        lambda *args, **kwargs: dispatched.append(args + (kwargs,)),
    )

    response = await auth_api.oauth_callback(
        request(pool=Pool(conn), redis=redis),
        code="oauth-code",
        state="u1",
    )

    assert response.headers["location"] == auth_api.FRONTEND_DASHBOARD_URL
    assert redis.deleted == ["gmail_sync_window:u1"]
    assert conn.execute_calls[0][1] == ("enc:refresh-token", "u1")
    assert dispatched[0][0] == "u1"


@pytest.mark.asyncio
async def test_oauth_callback_configuration_errors(monkeypatch):
    redis = Redis()

    monkeypatch.setattr(auth_api, "CLIENT_SECRETS_FILE", None)
    with pytest.raises(ValueError, match="CLIENT_SECRETS"):
        await auth_api.oauth_callback(request(redis=redis), code="code", state="u1")

    monkeypatch.setattr(auth_api, "CLIENT_SECRETS_FILE", '{"web": {}}')
    monkeypatch.setattr(auth_api, "BASE_URL", None)
    with pytest.raises(ValueError, match="BASE_URL"):
        await auth_api.oauth_callback(request(redis=redis), code="code", state="u1")


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("flow", "expected_detail"),
    [
        (Flow(fetch_error=RuntimeError("exchange failed")), "Failed to exchange"),
        (Flow(refresh_token=None), "Failed to exchange"),
    ],
)
async def test_oauth_callback_token_exchange_errors(monkeypatch, flow, expected_detail):
    install_flow(monkeypatch, flow)

    with pytest.raises(HTTPException) as exc:
        await auth_api.oauth_callback(request(redis=Redis()), code="code", state="u1")

    assert exc.value.status_code == 500
    assert expected_detail in exc.value.detail


@pytest.mark.asyncio
async def test_oauth_callback_db_dispatch_and_frontend_errors(monkeypatch):
    install_flow(monkeypatch, Flow())
    monkeypatch.setattr(auth_api, "encrypt_token", lambda token: token)
    monkeypatch.setattr(auth_api, "dispatch_gmail_watch_setup", lambda *_args, **_kwargs: None)

    with pytest.raises(HTTPException, match="Database error"):
        await auth_api.oauth_callback(
            request(pool=Pool(Conn(execute_error=RuntimeError("db"))), redis=Redis()),
            code="code",
            state="u1",
        )

    monkeypatch.setattr(
        auth_api,
        "dispatch_initial_gmail_sync",
        lambda *_args: (_ for _ in ()).throw(RuntimeError("queue")),
    )
    with pytest.raises(HTTPException, match="enqueue"):
        await auth_api.oauth_callback(
            request(pool=Pool(Conn()), redis=Redis()), code="code", state="u1"
        )

    monkeypatch.setattr(auth_api, "dispatch_initial_gmail_sync", lambda *_args: None)
    monkeypatch.setattr(auth_api, "dispatch_gmail_watch_setup", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(auth_api, "FRONTEND_DASHBOARD_URL", None)
    with pytest.raises(ValueError, match="FRONTEND_DASHBOARD_URL"):
        await auth_api.oauth_callback(
            request(pool=Pool(Conn()), redis=Redis()), code="code", state="u1"
        )


def test_mint_jwt_background_and_encode_error(monkeypatch):
    assert isinstance(auth_api.mint_jwt("u1"), str)

    monkeypatch.delenv("SUPABASE_JWT_SECRET")
    with pytest.raises(ValueError, match="SUPABASE_JWT_SECRET"):
        auth_api.mint_jwt("u1")

    monkeypatch.setenv("SUPABASE_JWT_SECRET", "unit-test-supabase-secret")
    monkeypatch.setattr(
        auth_api.jwt,
        "encode",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(RuntimeError("encode")),
    )
    with pytest.raises(RuntimeError, match="encode"):
        auth_api.mint_jwt("u1", exp=5)


@pytest.mark.asyncio
async def test_phase_2_store_and_respond_success_and_error(monkeypatch):
    monkeypatch.setattr(auth_api, "encrypt_token", lambda token: f"enc:{token}")
    conn = Conn()
    response = await auth_api.phase_2_store_and_respond(
        request(pool=Pool(conn)),
        {"uid": "u1", "email": "u@example.com"},
        "refresh",
        "jwt",
    )
    assert response.body == (
        b'{"status":"Success","message":"RLS session established.","user_id":"u1"}'
    )
    assert conn.execute_calls[0][1] == ("u1", "u@example.com", "jwt")

    with pytest.raises(HTTPException, match="Database error"):
        await auth_api.phase_2_store_and_respond(
            request(pool=Pool(Conn(execute_error=RuntimeError("db")))),
            {"uid": "u1"},
            "refresh",
            "jwt",
        )


class HttpResponse:
    def __init__(self, status_code=200, text="body"):
        self.status_code = status_code
        self.text = text


class HttpClient:
    def __init__(self, result):
        self.result = result

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return None

    async def post(self, *_args, **_kwargs):
        if isinstance(self.result, Exception):
            raise self.result
        return self.result


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "remote_result",
    [
        HttpResponse(),
        HttpResponse(400),
        httpx.RequestError("network"),
        RuntimeError("unexpected"),
    ],
)
async def test_revoke_gmail_consent_remote_outcomes(monkeypatch, remote_result):
    conn = Conn(fetchrow=[{"google_refresh_token": "encrypted"}])
    monkeypatch.setattr(auth_api, "decrypt_token", lambda token: f"dec:{token}")
    monkeypatch.setattr(
        auth_api.httpx, "AsyncClient", lambda: HttpClient(remote_result)
    )

    response = await auth_api.revoke_gmail_consent(
        request(pool=Pool(conn, conn)), {"uid": "u1"}
    )

    assert response.status_code == 200
    assert len(conn.execute_calls) == 2
    assert "google_refresh_token = NULL" in conn.execute_calls[0][0]
    assert "gmail_history_id = NULL" in conn.execute_calls[1][0]


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "record",
    [None, {"google_refresh_token": None}],
)
async def test_revoke_gmail_consent_without_remote_token(record):
    conn = Conn(fetchrow=[record])
    response = await auth_api.revoke_gmail_consent(
        request(pool=Pool(conn, conn)), {"uid": "u1"}
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_revoke_gmail_consent_db_errors(monkeypatch):
    with pytest.raises(HTTPException, match="retrieving refresh token"):
        await auth_api.revoke_gmail_consent(
            request(pool=Pool(Conn(fetchrow=[RuntimeError("read")]))), {"uid": "u1"}
        )

    monkeypatch.setattr(auth_api, "decrypt_token", lambda token: token)
    monkeypatch.setattr(
        auth_api.httpx, "AsyncClient", lambda: HttpClient(HttpResponse())
    )
    with pytest.raises(HTTPException, match="cleaning up"):
        await auth_api.revoke_gmail_consent(
            request(
                pool=Pool(
                    Conn(fetchrow=[{"google_refresh_token": "token"}]),
                    Conn(execute_error=RuntimeError("write")),
                )
            ),
            {"uid": "u1"},
        )


@pytest.mark.asyncio
async def test_setup_user_db_existing_created_and_error(monkeypatch):
    assert await auth_api.setup_user_db(
        request(pool=Pool(Conn(fetchrow=[{"user_id": "u1"}]))), {"uid": "u1"}
    ) == {"status": "exists", "user_id": "u1"}

    monkeypatch.setattr(auth_api, "mint_jwt", lambda uid: f"jwt:{uid}")
    created_conn = Conn(fetchrow=[None])
    assert await auth_api.setup_user_db(
        request(pool=Pool(created_conn, created_conn)),
        {"uid": "u1", "email": "u@example.com"},
    ) == {"status": "created", "user_id": "u1"}

    with pytest.raises(HTTPException, match="setting up"):
        await auth_api.setup_user_db(
            request(pool=Pool(Conn(fetchrow=[RuntimeError("db")]))), {"uid": "u1"}
        )


@pytest.mark.asyncio
async def test_setup_rls_session_missing_token_and_error(monkeypatch):
    monkeypatch.setattr(auth_api, "mint_jwt", lambda uid: f"jwt:{uid}")

    async def phase_2(_request, user_data, refresh_token, backend_jwt):
        return (user_data, refresh_token, backend_jwt)

    monkeypatch.setattr(auth_api, "phase_2_store_and_respond", phase_2)
    conn = Conn(fetchrow=[None])
    redis = Redis()
    result = await auth_api.setup_rls_session(
        request(pool=Pool(conn, conn), redis=redis),
        {"uid": "u1"},
        auth_api.SetupRLSBody(daysToSync=None),
    )
    assert result == ({"uid": "u1"}, "NO_GMAIL_TOKEN_GRANTED", "jwt:u1")
    assert redis.set_calls == [(("gmail_sync_window:u1", 180), {"ex": 30})]

    with pytest.raises(HTTPException, match="Critical system error"):
        await auth_api.setup_rls_session(
            request(pool=Pool(Conn(fetchrow=[RuntimeError("db")]))),
            {"uid": "u1"},
            auth_api.SetupRLSBody(),
        )


@pytest.mark.asyncio
async def test_setup_rls_session_existing_token(monkeypatch):
    async def phase_2(_request, user_data, refresh_token, backend_jwt):
        return (user_data, refresh_token, backend_jwt)

    monkeypatch.setattr(auth_api, "phase_2_store_and_respond", phase_2)
    redis = Redis()
    result = await auth_api.setup_rls_session(
        request(
            pool=Pool(Conn(fetchrow=[{"backend_rls_jwt": "existing"}])),
            redis=redis,
        ),
        {"uid": "u1"},
        auth_api.SetupRLSBody(daysToSync=7),
    )
    assert result == ({"uid": "u1"}, "NO_GMAIL_TOKEN_GRANTED", "existing")
    assert redis.set_calls == [(("gmail_sync_window:u1", 7), {"ex": 30})]


@pytest.mark.asyncio
async def test_setup_frontend_rls_session_success_and_error(monkeypatch):
    monkeypatch.setattr(auth_api, "mint_jwt", lambda uid, exp=None: f"{uid}:{exp}")
    assert await auth_api.setup_frontend_rls_session({"uid": "u1"}) == {
        "status": "success",
        "rls_jwt": "u1:30",
    }

    monkeypatch.setattr(
        auth_api,
        "mint_jwt",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(RuntimeError("jwt")),
    )
    with pytest.raises(HTTPException, match="mint"):
        await auth_api.setup_frontend_rls_session({"uid": "u1"})


@pytest.mark.asyncio
async def test_gmail_consent_status_success_missing_and_error():
    assert await auth_api.is_gmail_consent_provided(
        request(pool=Pool(Conn(fetchrow=[{"gmail_connected": False}]))), {"uid": "u1"}
    ) == {"isConnected": False}

    with pytest.raises(HTTPException) as missing:
        await auth_api.is_gmail_consent_provided(
            request(pool=Pool(Conn(fetchrow=[None]))), {"uid": "u1"}
        )
    assert missing.value.status_code == 404

    with pytest.raises(HTTPException) as db_error:
        await auth_api.is_gmail_consent_provided(
            request(pool=Pool(Conn(fetchrow=[RuntimeError("db")]))), {"uid": "u1"}
        )
    assert db_error.value.status_code == 500


class Auth:
    def __init__(self, *, revoke_error=None, delete_error=None):
        self.revoke_error = revoke_error
        self.delete_error = delete_error
        self.revoked = []
        self.deleted = []

    def revoke_refresh_tokens(self, uid):
        if self.revoke_error:
            raise self.revoke_error
        self.revoked.append(uid)

    def delete_user(self, uid):
        if self.delete_error:
            raise self.delete_error
        self.deleted.append(uid)


@pytest.mark.asyncio
async def test_logout_success_and_error(monkeypatch):
    auth = Auth()
    monkeypatch.setattr(auth_api, "get_auth", lambda: auth)
    assert await auth_api.logout({"uid": "u1"}) == {
        "status": "success",
        "message": "Logged out successfully",
    }
    assert auth.revoked == ["u1"]

    monkeypatch.setattr(
        auth_api, "get_auth", lambda: Auth(revoke_error=RuntimeError("firebase"))
    )
    with pytest.raises(HTTPException, match="log out"):
        await auth_api.logout({"uid": "u1"})


@pytest.mark.asyncio
async def test_delete_account_success_and_errors(monkeypatch):
    auth = Auth()
    monkeypatch.setattr(auth_api, "get_auth", lambda: auth)
    monkeypatch.setattr(
        auth_api,
        "decrypt_token",
        lambda token: {"enc:u1": "u1", "enc:u2": "u2"}[token],
    )
    conn = Conn(
        fetch=[
            [
                {"id": "staging-1", "user_id_enc": "enc:u1"},
                {"id": "staging-2", "user_id_enc": "enc:u2"},
            ]
        ]
    )
    assert await auth_api.delete_account(
        request(pool=Pool(conn)), {"uid": "u1"}
    ) == {"status": "success", "message": "Account deleted successfully"}
    assert auth.deleted == ["u1"]
    assert "FROM internal_staging.email_staging" in conn.fetch_calls[0][0]
    assert conn.execute_calls[0][1] == (["staging-1"],)
    assert conn.execute_calls[1][1] == ("u1",)

    with pytest.raises(HTTPException, match="delete account"):
        await auth_api.delete_account(
            request(pool=Pool(Conn(execute_error=RuntimeError("db")))), {"uid": "u1"}
        )

    monkeypatch.setattr(
        auth_api, "get_auth", lambda: Auth(delete_error=RuntimeError("firebase"))
    )
    with pytest.raises(HTTPException, match="delete account"):
        await auth_api.delete_account(request(pool=Pool(Conn())), {"uid": "u1"})


def test_me_and_dispatch_initial_gmail_sync(monkeypatch):
    assert auth_api.me({"uid": "u1"}) == {"uid": "u1", "email": None}

    calls = []
    monkeypatch.setattr(
        auth_api.celery_client,
        "send_task",
        lambda *args, **kwargs: calls.append((args, kwargs)) or "task",
    )
    assert (
        auth_api.dispatch_initial_gmail_sync("u1", "trace", datetime(2026, 1, 1))
        == "task"
    )
    assert calls[0][1]["headers"] == {"trace_id": "trace", "uid": "u1"}
