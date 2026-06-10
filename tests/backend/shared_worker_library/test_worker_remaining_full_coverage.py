from __future__ import annotations

from contextlib import contextmanager, nullcontext
import importlib
import os
import types

import pytest

from gmail import gmail_tasks
from shared_worker_library import database


class Retried(Exception):
    def __init__(self, **kwargs):
        super().__init__(str(kwargs.get("exc")))
        self.kwargs = kwargs


def retrying_task(retries=0):
    return types.SimpleNamespace(
        request=types.SimpleNamespace(retries=retries),
        retry=lambda **kwargs: (_ for _ in ()).throw(Retried(**kwargs)),
    )


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

    monkeypatch.setattr(
        gmail_tasks,
        "can_fetch_emails",
        lambda _uid: (_ for _ in ()).throw(RuntimeError("capability")),
    )
    with pytest.raises(Retried, match="capability") as error:
        gmail_tasks.fetch_content(task, ["one"], "uid", "trace", "token")
    assert error.value.kwargs["countdown"] == gmail_tasks.RETRY_DELAY

    monkeypatch.setattr(gmail_tasks, "can_fetch_emails", lambda _uid: True)

    @contextmanager
    def unavailable_lock(*_args, **_kwargs):
        raise gmail_tasks._LockNotAcquired()
        yield

    monkeypatch.setattr(gmail_tasks, "user_lock", unavailable_lock)
    monkeypatch.setattr(gmail_tasks, "_backoff", lambda _retries: 4.0)
    with pytest.raises(Retried) as error:
        gmail_tasks.fetch_content(task, ["one"], "uid", "trace", "token")
    assert error.value.kwargs["countdown"] == 4.0
    assert isinstance(error.value.kwargs["exc"], gmail_tasks._LockNotAcquired)

    monkeypatch.setattr(gmail_tasks, "user_lock", lambda *_args, **_kwargs: nullcontext())
    monkeypatch.setattr(
        gmail_tasks,
        "gmail_fetch_batch",
        lambda *_args: (_ for _ in ()).throw(RuntimeError("fatal")),
    )
    with pytest.raises(Retried, match="fatal") as error:
        gmail_tasks.fetch_content(task, ["one"], "uid", "trace", "token")
    assert error.value.kwargs["countdown"] == 4.0


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
    real_classify_error = gmail_tasks._classify_error
    monkeypatch.setattr(gmail_tasks, "_classify_error", lambda _exception: "OTHER")
    result = gmail_tasks.gmail_fetch_batch("trace", ["odd"], "token")
    assert result.skipped == ["odd"]
    monkeypatch.setattr(gmail_tasks, "_classify_error", real_classify_error)

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
    assert gmail_tasks._classify_error(None) == "SKIP"
    gmail_tasks.log_and_skip("trace", ["1", "2", "3", "4", "5", "6"])


def test_gmail_fetch_message_ids_http_failure(monkeypatch):
    monkeypatch.setattr(
        gmail_tasks.requests,
        "get",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(RuntimeError("network")),
    )
    with pytest.raises(RuntimeError, match="network"):
        gmail_tasks.fetch_message_ids("token", "trace")


def test_worker_database_missing_url_guard(monkeypatch):
    worker_url = os.environ["WORKER_DATABASE_URL"]
    monkeypatch.delenv("WORKER_DATABASE_URL")
    try:
        with pytest.raises(ValueError, match="WORKER_DATABASE_URL"):
            importlib.reload(database)
    finally:
        monkeypatch.setenv("WORKER_DATABASE_URL", worker_url)
        importlib.reload(database)


def test_gmail_missing_broker_guard(monkeypatch):
    broker_url = os.environ["CELERY_BROKER_URL_LOCAL"]
    monkeypatch.delenv("CELERY_BROKER_URL_LOCAL")
    monkeypatch.delenv("CELERY_BROKER_URL_PROD", raising=False)
    try:
        with pytest.raises(ValueError, match="CELERY_BROKER_URL"):
            importlib.reload(gmail_tasks)
    finally:
        monkeypatch.setenv("CELERY_BROKER_URL_LOCAL", broker_url)
        importlib.reload(gmail_tasks)
