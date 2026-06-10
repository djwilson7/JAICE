"""Tests for the gmail domain.

Covers: gmail.gmail_tasks, gmail.gmail_queries, gmail.pubsub_listener
"""
from __future__ import annotations

import base64
import importlib
import json
import sys
import types
from collections import deque
from contextlib import contextmanager, nullcontext

import pytest

from gmail import gmail_tasks, gmail_queries


# ---------------------------------------------------------------------------
# Helpers / stubs
# ---------------------------------------------------------------------------

class Cursor:
    def __init__(self, rows=(), *, rowcount=1, error=None):
        self.rows = deque(rows)
        self.rowcount = rowcount
        self.error = error
        self.execute_calls = []

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return None

    def execute(self, query, params=None, **kwargs):
        if self.error:
            raise self.error
        self.execute_calls.append((query, params, kwargs))

    def fetchone(self):
        return self.rows.popleft() if self.rows else None

    def fetchall(self):
        return list(self.rows)


class Conn:
    def __init__(self, *cursors):
        self.cursors = deque(cursors)
        self.commits = 0
        self.autocommit = False
        self.prepare_threshold = None

    def cursor(self, **_kwargs):
        return self.cursors.popleft()

    def commit(self):
        self.commits += 1


def connection_factory(*connections):
    queued = deque(connections)

    @contextmanager
    def get_connection():
        yield queued.popleft()

    return get_connection


class Retried(Exception):
    def __init__(self, **kwargs):
        super().__init__(str(kwargs.get("exc")))
        self.kwargs = kwargs


def retrying_task(retries=0):
    return types.SimpleNamespace(
        request=types.SimpleNamespace(retries=retries),
        retry=lambda **kwargs: (_ for _ in ()).throw(Retried(**kwargs)),
    )


def _install_pubsub_stub():
    if "google.cloud.pubsub_v1" in sys.modules:
        return
    google_cloud = sys.modules.setdefault("google.cloud", types.ModuleType("google.cloud"))
    pubsub_v1 = types.ModuleType("google.cloud.pubsub_v1")

    class SubscriberClient:
        def subscribe(self, *_args, **_kwargs):
            return types.SimpleNamespace(result=lambda: None, cancel=lambda: None)

        def close(self):
            return None

    pubsub_v1.SubscriberClient = SubscriberClient
    pubsub_v1.subscriber = types.SimpleNamespace(
        message=types.SimpleNamespace(Message=object)
    )
    google_cloud.pubsub_v1 = pubsub_v1
    sys.modules["google.cloud.pubsub_v1"] = pubsub_v1


# ---------------------------------------------------------------------------
# gmail.gmail_queries
# ---------------------------------------------------------------------------

def test_gmail_query_helpers(monkeypatch):
    monkeypatch.setattr(
        gmail_queries,
        "get_connection",
        connection_factory(Conn(Cursor([("encrypted",)])), Conn(Cursor([])), Conn(Cursor([("token",)]))),
    )
    assert gmail_queries.get_refresh_token("user") == "encrypted"
    assert gmail_queries.get_refresh_token("missing") is None
    assert gmail_queries.can_fetch_emails("user") == "token"

    monkeypatch.setattr(
        gmail_queries,
        "get_connection",
        connection_factory(
            Conn(Cursor([("one",)])),
            Conn(Cursor([])),
            Conn(Cursor(error=RuntimeError("insert"))),
        ),
    )
    inserted = gmail_queries.insert_staging_records("trace", [{"id": "1"}, {"id": "2"}, {"id": "3"}])
    assert inserted == []


# ---------------------------------------------------------------------------
# gmail.gmail_tasks — parsing helpers
# ---------------------------------------------------------------------------

def test_gmail_parsing_helpers_and_payload(monkeypatch):
    assert gmail_tasks._get_header([{"name": "Subject", "value": "Hi"}], "subject") == "Hi"
    assert gmail_tasks._get_header([], "subject") == ""

    encoded = base64.urlsafe_b64encode(b"plain body").decode("ascii")
    assert gmail_tasks._decode_gmail_body(encoded) == "plain body"
    assert gmail_tasks.strip_html("<p>Hello</p>") == "Hello"
    assert (
        gmail_tasks.strip_html(
            "<style>.hidden{}</style><p>Infrastructure Engineer</p><p>Kalderos</p>"
        )
        == "Infrastructure Engineer\nKalderos"
    )
    assert gmail_tasks.extract_plain_text_from_payload({"mimeType": "text/plain", "body": {"data": encoded}}) == "plain body"

    assert gmail_tasks._classify_error(Exception("404 notFound")) == "SKIP"
    assert gmail_tasks._classify_error(Exception("rateLimitExceeded 429")) == "RETRY"
    assert gmail_tasks._classify_error(Exception("503")) == "RETRY"
    assert gmail_tasks._classify_error(Exception("weird")) == "SKIP"
    assert gmail_tasks._classify_error(None) == "SKIP"

    monkeypatch.setattr(gmail_tasks.random, "uniform", lambda _a, _b: 0.5)
    assert gmail_tasks._backoff(0) == 2.5
    assert list(gmail_tasks.chunk_list([1, 2, 3], 2)) == [[1, 2], [3]]

    monkeypatch.setattr(gmail_tasks.uuid, "uuid4", lambda: "row-1")
    monkeypatch.setattr(gmail_tasks, "encrypt_token", lambda value: f"enc:{value}".encode())
    payload = gmail_tasks.prepare_staging_payload(
        "trace",
        [
            {
                "user_id": "u",
                "trace_id": "trace",
                "provider": "google",
                "provider_message_id": "m1",
                "subject": "Job",
                "sender": "recruiter",
                "received_at": "123",
                "body_text": "plain body",
            }
        ],
    )
    assert payload[0]["id"] == "row-1"
    assert payload[0]["status"] == "AWAIT_CLASSIFICATION"


def test_gmail_http_helpers(monkeypatch):
    class Response:
        def __init__(self, status_code, data):
            self.status_code = status_code
            self._data = data
            self.text = "body"

        def raise_for_status(self):
            if self.status_code >= 400:
                raise RuntimeError("http error")

        def json(self):
            return self._data

    pages = [
        Response(200, {"messages": [{"id": "m1"}], "nextPageToken": "next"}),
        Response(200, {"messages": [{"id": "m2"}]}),
    ]
    monkeypatch.setattr(gmail_tasks.requests, "get", lambda *_a, **_k: pages.pop(0))
    assert gmail_tasks.fetch_message_ids("token", "trace", days_back=1) == ["m1", "m2"]

    monkeypatch.setattr(gmail_tasks.requests, "post", lambda *_a, **_k: Response(200, {"access_token": "access"}))
    assert gmail_tasks.get_access_token_from_refresh("refresh", "trace") == "access"

    monkeypatch.setattr(gmail_tasks.requests, "post", lambda *_a, **_k: Response(200, {}))
    with pytest.raises(Exception, match="No access token"):
        gmail_tasks.get_access_token_from_refresh("refresh", "trace")


def test_gmail_history_helpers(monkeypatch):
    monkeypatch.setattr(gmail_tasks, "GMAIL_PUBSUB_PROJECT_ID", "project-1")
    monkeypatch.setattr(gmail_tasks, "GMAIL_PUBSUB_TOPIC", "topic-1")
    assert gmail_tasks._topic_name() == "projects/project-1/topics/topic-1"

    history = [
        {
            "messagesAdded": [
                {"message": {"id": "m1"}},
                {"message": {"id": "m1"}},
                {"message": {"id": "m2"}},
            ]
        },
        {"messagesAdded": [{"message": {}}]},
    ]
    assert gmail_tasks.extract_message_ids_from_history(history) == ["m1", "m2"]
    assert gmail_tasks.dedupe_preserve_order(["a", "b", "a"]) == ["a", "b"]


# ---------------------------------------------------------------------------
# gmail.gmail_tasks — lock, batch, and dispatch
# ---------------------------------------------------------------------------

def test_gmail_task_lock_batch_and_wrappers(monkeypatch):
    class Redis:
        def __init__(self, slots):
            self.slots = deque(slots)
            self.deleted = []

        def set(self, *_args, **_kwargs):
            return self.slots.popleft()

        def delete(self, key):
            self.deleted.append(key)

    redis = Redis([False, True])
    monkeypatch.setattr(gmail_tasks, "r", redis)
    with gmail_tasks.user_lock("trace", "user"):
        pass
    assert redis.deleted == ["gmail_lock:user:1"]

    monkeypatch.setattr(gmail_tasks, "r", Redis([False, False]))
    with pytest.raises(gmail_tasks._LockNotAcquired):
        with gmail_tasks.user_lock("trace", "user"):
            pass

    class Batch:
        def __init__(self, callback):
            self.callback = callback
            self.ids = []

        def add(self, _request, request_id):
            self.ids.append(request_id)

        def execute(self):
            self.callback(self.ids[0], {"id": self.ids[0]}, None)
            self.callback(self.ids[1], None, Exception("404"))
            self.callback(self.ids[2], None, Exception("429"))

    class Service:
        def new_batch_http_request(self, callback):
            return Batch(callback)

        def users(self):
            return self

        def messages(self):
            return self

        def get(self, **kwargs):
            return kwargs

    monkeypatch.setattr(gmail_tasks, "build", lambda *_args, **_kwargs: Service())
    monkeypatch.setattr(gmail_tasks.time, "sleep", lambda _seconds: None)
    batch = gmail_tasks.gmail_fetch_batch("trace", ["ok", "skip", "retry"], "token")
    assert [item["msg_id"] for item in batch.successful] == ["ok"]
    assert batch.skipped == ["skip"]
    assert batch.retry == ["retry"]

    monkeypatch.setattr(gmail_tasks, "insert_staging_records", lambda *_args: ["one"])
    assert gmail_tasks.write_to_staging("trace", [{}]) == ["one"]
    monkeypatch.setattr(
        gmail_tasks,
        "insert_staging_records",
        lambda *_args: (_ for _ in ()).throw(RuntimeError("insert")),
    )
    with pytest.raises(RuntimeError, match="insert"):
        gmail_tasks.write_to_staging("trace", [{}])

    sent = []
    monkeypatch.setattr(gmail_tasks.celery_app, "send_task", lambda *args, **kwargs: sent.append((args, kwargs)))
    gmail_tasks.enqueue_model_processing("trace", ["one"])
    assert sent
    gmail_tasks.log_and_skip("trace", [])
    gmail_tasks.log_and_skip("trace", ["one", "two"])

    retries = []
    monkeypatch.setattr(gmail_tasks.fetch_content, "apply_async", lambda **kwargs: retries.append(kwargs))
    monkeypatch.setattr(gmail_tasks, "_backoff", lambda _count: 3.0)
    gmail_tasks.schedule_retry(
        types.SimpleNamespace(request=types.SimpleNamespace(retries=2)),
        "trace",
        ["one"],
        "uid",
        "token",
    )
    assert retries[0]["countdown"] == 3.0


# ---------------------------------------------------------------------------
# gmail.gmail_tasks — initial_sync and fetch_content retry paths
# ---------------------------------------------------------------------------

def test_gmail_initial_sync_retry_paths(monkeypatch):
    task = retrying_task()
    monkeypatch.setattr(gmail_tasks, "can_fetch_emails", lambda _uid: True)
    monkeypatch.setattr(gmail_tasks, "get_refresh_token", lambda _uid: b"refresh")
    monkeypatch.setattr(gmail_tasks, "decrypt_token", lambda value: value.decode())
    monkeypatch.setattr(gmail_tasks, "get_access_token_from_refresh", lambda *_args: "access")
    monkeypatch.setattr(gmail_tasks, "fetch_message_ids", lambda *_args: ["one"])
    monkeypatch.setattr(gmail_tasks, "encrypt_token", lambda value: value.encode())
    monkeypatch.setattr(gmail_tasks.fetch_content, "delay", lambda *_args: None)

    for name in (
        "can_fetch_emails",
        "get_refresh_token",
        "get_access_token_from_refresh",
        "fetch_message_ids",
    ):
        with monkeypatch.context() as scoped:
            scoped.setattr(
                gmail_tasks,
                name,
                lambda *_args, name=name: (_ for _ in ()).throw(RuntimeError(name)),
            )
            with pytest.raises(Retried, match=name):
                gmail_tasks.initial_sync(task, "user", "trace", "2026-01-01")

    with monkeypatch.context() as scoped:
        scoped.setattr(
            gmail_tasks.fetch_content,
            "delay",
            lambda *_args: (_ for _ in ()).throw(RuntimeError("delay")),
        )
        with pytest.raises(Retried, match="delay"):
            gmail_tasks.initial_sync(task, "user", "trace", "2026-01-01")


def test_gmail_fetch_content_paths(monkeypatch):
    task = retrying_task(retries=2)
    monkeypatch.setattr(gmail_tasks, "decrypt_token", lambda value: value)
    monkeypatch.setattr(gmail_tasks, "can_fetch_emails", lambda _uid: True)
    monkeypatch.setattr(gmail_tasks, "user_lock", lambda *_args, **_kwargs: nullcontext())
    monkeypatch.setattr(
        gmail_tasks,
        "gmail_fetch_batch",
        lambda *_args: gmail_tasks.BatchResult(successful=["raw"], retry=[], skipped=[]),
    )
    monkeypatch.setattr(gmail_tasks, "parse_successful_fetches", lambda *_args: ["parsed"])
    monkeypatch.setattr(gmail_tasks, "prepare_staging_payload", lambda *_args: ["encrypted"])
    monkeypatch.setattr(gmail_tasks, "write_to_staging", lambda *_args: ["row"])
    enqueued = []
    monkeypatch.setattr(gmail_tasks, "enqueue_model_processing", lambda *args: enqueued.append(args))
    scheduled = []
    monkeypatch.setattr(gmail_tasks, "schedule_retry", lambda *args: scheduled.append(args))

    assert gmail_tasks.fetch_content(task, ["one"], "uid", "trace", "token") is None
    assert enqueued == [("trace", ["row"])]

    monkeypatch.setattr(
        gmail_tasks,
        "gmail_fetch_batch",
        lambda *_args: gmail_tasks.BatchResult(successful=[], retry=["again"], skipped=[]),
    )
    assert gmail_tasks.fetch_content(task, ["one"], "uid", "trace", "token") is None
    assert scheduled

    monkeypatch.setattr(gmail_tasks, "can_fetch_emails", lambda _uid: False)
    assert gmail_tasks.fetch_content(task, ["one"], "uid", "trace", "token") is None


def test_gmail_fetch_message_ids_http_failure(monkeypatch):
    monkeypatch.setattr(
        gmail_tasks.requests,
        "get",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(RuntimeError("network")),
    )
    with pytest.raises(RuntimeError, match="network"):
        gmail_tasks.fetch_message_ids("token", "trace")


def test_gmail_missing_broker_guard(monkeypatch):
    import os
    broker_url = os.environ["CELERY_BROKER_URL_LOCAL"]
    monkeypatch.delenv("CELERY_BROKER_URL_LOCAL")
    monkeypatch.delenv("CELERY_BROKER_URL_PROD", raising=False)
    try:
        with pytest.raises(ValueError, match="CELERY_BROKER_URL"):
            importlib.reload(gmail_tasks)
    finally:
        monkeypatch.setenv("CELERY_BROKER_URL_LOCAL", broker_url)
        importlib.reload(gmail_tasks)


def test_gmail_remaining_lock_batch_and_payload_branches(monkeypatch):
    class Redis:
        def set(self, *_args, **_kwargs):
            return True

        def delete(self, _key):
            raise RuntimeError("redis delete")

    monkeypatch.setattr(gmail_tasks, "r", Redis())
    with gmail_tasks.user_lock("trace", "user"):
        pass

    class Batch:
        def __init__(self, callback):
            self.callback = callback
            self.ids = []

        def add(self, _request, request_id):
            self.ids.append(request_id)

        def execute(self):
            self.callback(self.ids[0], None, RuntimeError("odd"))

    class Service:
        def new_batch_http_request(self, callback):
            return Batch(callback)

        def users(self):
            return self

        def messages(self):
            return self

        def get(self, **kwargs):
            return kwargs

    monkeypatch.setattr(gmail_tasks, "build", lambda *_args, **_kwargs: Service())
    monkeypatch.setattr(gmail_tasks.time, "sleep", lambda _seconds: None)
    monkeypatch.setattr(gmail_tasks, "_classify_error", lambda _exception: "OTHER")
    result = gmail_tasks.gmail_fetch_batch("trace", ["odd"], "token")
    assert result.skipped == ["odd"]

    encoded_html = gmail_tasks.base64.urlsafe_b64encode(b"<p>html</p>").decode()
    encoded_plain = gmail_tasks.base64.urlsafe_b64encode(b"plain").decode()
    assert gmail_tasks.extract_plain_text_from_payload(
        {"mimeType": "text/html", "body": {"data": encoded_html}}
    ) == "html"
    assert gmail_tasks.extract_plain_text_from_payload(
        {
            "parts": [
                {"mimeType": "text/plain", "body": {"data": encoded_plain}},
                {"parts": [{"mimeType": "text/plain", "body": {"data": encoded_plain}}]},
            ]
        }
    ) == "plain"
    assert gmail_tasks.extract_plain_text_from_payload({}) == ""
    gmail_tasks.log_and_skip("trace", ["1", "2", "3", "4", "5", "6"])


# ---------------------------------------------------------------------------
# gmail.pubsub_listener
# ---------------------------------------------------------------------------

def test_pubsub_listener_decode_and_dispatch(monkeypatch):
    _install_pubsub_stub()
    from gmail import pubsub_listener

    monkeypatch.setenv("GMAIL_PUBSUB_PROJECT_ID", "project-1")
    monkeypatch.delenv("GMAIL_PUBSUB_SUBSCRIPTION", raising=False)
    monkeypatch.setenv("GMAIL_PUBSUB_SUBSCRIPTION_NAME", "sub-1")
    assert pubsub_listener.subscription_path() == "projects/project-1/subscriptions/sub-1"

    monkeypatch.setenv("GMAIL_PUBSUB_SUBSCRIPTION", "projects/project-2/subscriptions/sub-2")
    assert pubsub_listener.subscription_path() == "projects/project-2/subscriptions/sub-2"

    raw = {"emailAddress": "u@example.com", "historyId": "123"}
    encoded = base64.urlsafe_b64encode(json.dumps(raw).encode()).decode().rstrip("=")
    assert pubsub_listener.decode_gmail_pubsub_data(json.dumps(raw).encode()) == raw
    assert pubsub_listener.decode_gmail_pubsub_data(encoded) == raw
    with pytest.raises(pubsub_listener.InvalidPubSubPayload):
        pubsub_listener.decode_gmail_pubsub_data(b"\x00\xa2\xff")

    sent = {}

    class CeleryClient:
        def send_task(self, *args, **kwargs):
            sent["args"] = args
            sent["kwargs"] = kwargs

    pubsub_listener.dispatch_pubsub_event(CeleryClient(), "pubsub-1", raw)
    assert sent["args"][0] == "gmail.process_history_event"
    assert sent["kwargs"]["args"][0:3] == ["pubsub-1", "u@example.com", "123"]


def test_pubsub_listener_subscription_path_missing_env(monkeypatch):
    _install_pubsub_stub()
    from gmail import pubsub_listener

    monkeypatch.delenv("GMAIL_PUBSUB_PROJECT_ID", raising=False)
    monkeypatch.delenv("GMAIL_PUBSUB_SUBSCRIPTION", raising=False)
    monkeypatch.delenv("GMAIL_PUBSUB_SUBSCRIPTION_NAME", raising=False)
    with pytest.raises(ValueError, match="GMAIL_PUBSUB_PROJECT_ID"):
        pubsub_listener.subscription_path()

    monkeypatch.setenv("GMAIL_PUBSUB_PROJECT_ID", "proj")
    with pytest.raises(ValueError, match="GMAIL_PUBSUB_SUBSCRIPTION_NAME"):
        pubsub_listener.subscription_path()


def test_pubsub_listener_dispatch_missing_fields(monkeypatch):
    _install_pubsub_stub()
    from gmail import pubsub_listener

    class CeleryClient:
        def send_task(self, *args, **kwargs):
            pass

    with pytest.raises(ValueError, match="emailAddress"):
        pubsub_listener.dispatch_pubsub_event(CeleryClient(), "msg-1", {})


# ---------------------------------------------------------------------------
# Extra Gmail coverage
# ---------------------------------------------------------------------------

from googleapiclient.errors import HttpError
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock, patch

class MockResponse:
    def __init__(self, status):
        self.status = status
        self.reason = "Error"

def test_is_invalid_history_error():
    err = HttpError(resp=MockResponse(400), content=b"invalid history")
    assert gmail_tasks._is_invalid_history_error(err) is True
    err2 = HttpError(resp=MockResponse(500), content=b"error")
    assert gmail_tasks._is_invalid_history_error(err2) is False

def test_stop_gmail_watch_for_user(monkeypatch):
    monkeypatch.setattr(gmail_tasks, "get_gmail_sync_state", lambda uid: None)
    cleared = []
    monkeypatch.setattr(gmail_tasks, "clear_gmail_sync_state", lambda uid: cleared.append(uid))
    gmail_tasks.stop_gmail_watch_for_user("u1", "trace")
    assert cleared == ["u1"]
    
    monkeypatch.setattr(gmail_tasks, "get_gmail_sync_state", lambda uid: {"google_refresh_token": "token"})
    monkeypatch.setattr(gmail_tasks, "decrypt_token", lambda t: t)
    monkeypatch.setattr(gmail_tasks, "get_access_token_from_refresh", lambda t, tid: "access")
    
    mock_service = MagicMock()
    monkeypatch.setattr(gmail_tasks, "build_gmail_service", lambda t: mock_service)
    
    gmail_tasks.stop_gmail_watch_for_user("u1", "trace")
    assert mock_service.users().stop.called

def test_ensure_gmail_watch_active(monkeypatch):
    now = datetime.now(timezone.utc)
    expiration = now + timedelta(days=2)
    monkeypatch.setattr(gmail_tasks, "get_gmail_sync_state", lambda uid: {
        "google_refresh_token": "token",
        "gmail_watch_expiration": expiration,
        "gmail_history_id": "h1"
    })
    res = gmail_tasks.ensure_gmail_watch("u1", "trace")
    assert res["status"] == "active"
    assert res["history_id"] == "h1"

def test_ensure_gmail_watch_renewed(monkeypatch):
    now = datetime.now(timezone.utc)
    expiration = now + timedelta(hours=1)
    monkeypatch.setattr(gmail_tasks, "get_gmail_sync_state", lambda uid: {
        "google_refresh_token": "token",
        "gmail_watch_expiration": expiration,
        "gmail_history_id": "h1"
    })
    monkeypatch.setattr(gmail_tasks, "decrypt_token", lambda t: t)
    monkeypatch.setattr(gmail_tasks, "get_access_token_from_refresh", lambda t, tid: "access")
    
    mock_service = MagicMock()
    mock_service.users().watch().execute.return_value = {"historyId": "h2", "expiration": "1700000000000"}
    monkeypatch.setattr(gmail_tasks, "build_gmail_service", lambda t: mock_service)
    monkeypatch.setattr(gmail_tasks, "update_gmail_watch_state", lambda *args: None)
    monkeypatch.setattr(gmail_tasks, "_topic_name", lambda: "topic")
    
    res = gmail_tasks.ensure_gmail_watch("u1", "trace")
    assert res["status"] == "renewed"
    assert res["history_id"] == "h2"

def test_fetch_history_message_ids_paging(monkeypatch):
    mock_service = MagicMock()
    mock_service.users().history().list().execute.side_effect = [
        {"historyId": "h2", "history": [{"messagesAdded": [{"message": {"id": "m1"}}]}], "nextPageToken": "p1"},
        {"historyId": "h3", "history": [{"messagesAdded": [{"message": {"id": "m2"}}]}], "nextPageToken": None}
    ]
    monkeypatch.setattr(gmail_tasks, "build_gmail_service", lambda t: mock_service)
    
    ids, latest = gmail_tasks.fetch_history_message_ids("access", "trace", "h1")
    assert ids == ["m1", "m2"]
    assert latest == "h3"

def test_sync_history_for_user_not_connected(monkeypatch):
    monkeypatch.setattr(gmail_tasks, "get_gmail_sync_state", lambda uid: None)
    res = gmail_tasks.sync_history_for_user("u1", "trace")
    assert res["status"] == "skipped"

def test_sync_history_for_user_no_history_id(monkeypatch):
    monkeypatch.setattr(gmail_tasks, "get_gmail_sync_state", lambda uid: {"google_refresh_token": "token", "gmail_history_id": None})
    monkeypatch.setattr(gmail_tasks, "fallback_time_window_sync", lambda *args: {"status": "fallback"})
    res = gmail_tasks.sync_history_for_user("u1", "trace")
    assert res["status"] == "fallback"

def test_sync_history_for_user_expired_history(monkeypatch):
    monkeypatch.setattr(gmail_tasks, "get_gmail_sync_state", lambda uid: {"google_refresh_token": "token", "gmail_history_id": "h1"})
    monkeypatch.setattr(gmail_tasks, "decrypt_token", lambda t: t)
    monkeypatch.setattr(gmail_tasks, "get_access_token_from_refresh", lambda t, tid: "access")
    
    def mock_fetch(*args):
        raise HttpError(resp=MockResponse(400), content=b"invalid history")
    
    monkeypatch.setattr(gmail_tasks, "fetch_history_message_ids", mock_fetch)
    monkeypatch.setattr(gmail_tasks, "fallback_time_window_sync", lambda *args: {"status": "fallback"})
    
    res = gmail_tasks.sync_history_for_user("u1", "trace")
    assert res["status"] == "fallback"

def test_process_history_event_unknown_user(monkeypatch):
    monkeypatch.setattr(gmail_tasks, "get_user_by_email", lambda email: None)
    res = gmail_tasks.process_history_event(None, "m1", "u@e.com", "h1")
    assert res["status"] == "ignored"

def test_process_history_event_success(monkeypatch):
    monkeypatch.setattr(gmail_tasks, "get_user_by_email", lambda email: "u1")
    monkeypatch.setattr(gmail_tasks, "update_pubsub_marker", lambda *args: None)
    monkeypatch.setattr(gmail_tasks, "sync_history_for_user", lambda *args, **kw: {"status": "success"})
    monkeypatch.setattr(gmail_tasks, "ensure_gmail_watch", lambda *args, **kw: "watch")
    
    res = gmail_tasks.process_history_event(None, "m1", "u@e.com", "h1")
    assert res["status"] == "success"
    assert res["watch"] == "watch"

def test_initial_sync_success(monkeypatch):
    task = MagicMock()
    monkeypatch.setattr(gmail_tasks, "can_fetch_emails", lambda uid: True)
    monkeypatch.setattr(gmail_tasks, "get_refresh_token", lambda uid: "token")
    monkeypatch.setattr(gmail_tasks, "decrypt_token", lambda t: t)
    monkeypatch.setattr(gmail_tasks, "get_access_token_from_refresh", lambda t, tid: "access")
    monkeypatch.setattr(gmail_tasks, "fetch_message_ids", lambda *args, **kw: ["m1"])
    monkeypatch.setattr(gmail_tasks, "encrypt_token", lambda t: t)
    
    with patch("gmail.gmail_tasks.fetch_content.delay") as mock_delay:
        gmail_tasks.initial_sync(task, "u1", "trace", "2026-01-01")
        assert mock_delay.called

def test_fetch_content_success(monkeypatch):
    task = MagicMock()
    task.request.retries = 0
    monkeypatch.setattr(gmail_tasks, "decrypt_token", lambda t: t)
    monkeypatch.setattr(gmail_tasks, "can_fetch_emails", lambda uid: True)
    monkeypatch.setattr(gmail_tasks, "user_lock", lambda *args, **kwargs: MagicMock())
    
    mock_batch = MagicMock()
    mock_batch.successful = ["raw"]
    mock_batch.retry = []
    mock_batch.skipped = []
    monkeypatch.setattr(gmail_tasks, "gmail_fetch_batch", lambda *args: mock_batch)
    monkeypatch.setattr(gmail_tasks, "parse_successful_fetches", lambda *args: ["parsed"])
    monkeypatch.setattr(gmail_tasks, "prepare_staging_payload", lambda *args: ["payload"])
    monkeypatch.setattr(gmail_tasks, "write_to_staging", lambda *args: ["row1"])
    
    with patch("gmail.gmail_tasks.enqueue_model_processing") as mock_enqueue:
        gmail_tasks.fetch_content(task, ["m1"], "u1", "trace", "access")
        assert mock_enqueue.called

def test_get_user_by_email_extra(monkeypatch):
    monkeypatch.setattr(
        gmail_queries,
        "get_connection",
        connection_factory(Conn(Cursor([("uid123",)])), Conn(Cursor([]))),
    )
    assert gmail_queries.get_user_by_email("test@example.com") == "uid123"
    assert gmail_queries.get_user_by_email("missing@example.com") is None

def test_get_gmail_sync_state_extra(monkeypatch):
    row = (
        "u1", "u@e.com", "ref", True, "h1", None, "m1"
    )
    monkeypatch.setattr(
        gmail_queries,
        "get_connection",
        connection_factory(Conn(Cursor([row])), Conn(Cursor([]))),
    )
    state = gmail_queries.get_gmail_sync_state("u1")
    assert state["user_id"] == "u1"
    assert state["gmail_history_id"] == "h1"
    assert gmail_queries.get_gmail_sync_state("missing") is None

def test_update_helpers_extra(monkeypatch):
    c1 = Cursor([])
    c2 = Cursor([])
    c3 = Cursor([])
    c4 = Cursor([])
    c5 = Cursor([])
    monkeypatch.setattr(
        gmail_queries,
        "get_connection",
        connection_factory(Conn(c1), Conn(c2), Conn(c3), Conn(c4), Conn(c5)),
    )
    gmail_queries.update_gmail_watch_state("u1", "h1", 123456789)
    assert "UPDATE public.user_account" in c1.execute_calls[0][0]
    
    gmail_queries.update_gmail_history_id("u1", "h2")
    assert "UPDATE public.user_account" in c2.execute_calls[0][0]
    
    gmail_queries.update_pubsub_marker("u1", "m1")
    assert "UPDATE public.user_account" in c3.execute_calls[0][0]
    
    gmail_queries.mark_gmail_sync_error("u1", "some error")
    assert "UPDATE public.user_account" in c4.execute_calls[0][0]
    
    gmail_queries.clear_gmail_sync_state("u1")
    assert "UPDATE public.user_account" in c5.execute_calls[0][0]

def test_can_fetch_emails_extra(monkeypatch):
    monkeypatch.setattr(
        gmail_queries,
        "get_connection",
        connection_factory(Conn(Cursor([("token",)])), Conn(Cursor([]))),
    )
    assert gmail_queries.can_fetch_emails("u1") == "token"
    assert gmail_queries.can_fetch_emails("missing") is False

def test_insert_staging_records_exception_extra(monkeypatch):
    c1 = Cursor(error=RuntimeError("db error"))
    monkeypatch.setattr(
        gmail_queries,
        "get_connection",
        lambda: Conn(c1),
    )
    res = gmail_queries.insert_staging_records("trace", [{"id": "1"}])
    assert res == []

def test_validate_google_credentials_file_extra(monkeypatch, tmp_path):
    from gmail import pubsub_listener
    monkeypatch.delenv("GOOGLE_APPLICATION_CREDENTIALS", raising=False)
    with pytest.raises(ValueError, match="GOOGLE_APPLICATION_CREDENTIALS environment variable is not set"):
        pubsub_listener.validate_google_credentials_file()
        
    fake_file = tmp_path / "creds.json"
    monkeypatch.setenv("GOOGLE_APPLICATION_CREDENTIALS", str(fake_file))
    with pytest.raises(ValueError, match="file does not exist"):
        pubsub_listener.validate_google_credentials_file()
        
    fake_file.write_text("{}", encoding="utf-8")
    pubsub_listener.validate_google_credentials_file() # Should pass
    
    fake_dir = tmp_path / "creds_dir"
    fake_dir.mkdir()
    monkeypatch.setenv("GOOGLE_APPLICATION_CREDENTIALS", str(fake_dir))
    with pytest.raises(ValueError, match="points to a directory"):
        pubsub_listener.validate_google_credentials_file()

def test_main_disabled_extra(monkeypatch):
    from gmail import pubsub_listener
    monkeypatch.setattr(pubsub_listener, "subscription_path", lambda: (_ for _ in ()).throw(ValueError("proj")))
    monkeypatch.setattr(pubsub_listener.time, "sleep", lambda s: (_ for _ in ()).throw(RuntimeError("sleep")))
    with pytest.raises(RuntimeError, match="sleep"):
        pubsub_listener.main()

def test_decode_gmail_pubsub_data_raw_json_extra():
    from gmail import pubsub_listener
    data = '{"emailAddress": "test@example.com", "historyId": 123}'
    assert pubsub_listener.decode_gmail_pubsub_data(data) == {"emailAddress": "test@example.com", "historyId": 123}
    assert pubsub_listener.decode_gmail_pubsub_data(data.encode()) == {"emailAddress": "test@example.com", "historyId": 123}

def test_gmail_worker_import_direct():
    import gmail.gmail_worker
    assert gmail.gmail_worker is not None
