from __future__ import annotations

from collections import deque
from contextlib import contextmanager
import types

import pytest

from classification import class_tasks, llm_classifier
from client_api.services import firebase_admin
from client_api.services.resume_chat import providers
from gmail import gmail_queries, gmail_tasks
from ner import ner_tasks
from shared_worker_library import database
from shared_worker_library.db_queries import std_queries, transfer_query


class Cursor:
    def __init__(self, rows=(), *, rowcount=1, error: Exception | None = None):
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


def test_worker_database_pool_and_connection(monkeypatch):
    conn = types.SimpleNamespace()

    class Pool:
        created = []

        def __class_getitem__(cls, _item):
            return cls

        def __init__(self, **kwargs):
            self.kwargs = kwargs
            self.returned = []
            self.created.append(self)

        def getconn(self):
            return conn

        def putconn(self, value):
            self.returned.append(value)

    monkeypatch.setattr(database, "ConnectionPool", Pool)
    monkeypatch.setattr(database, "pool", None)

    pool = database.get_pool()
    assert database.get_pool() is pool
    with database.get_connection() as acquired:
        assert acquired is conn
    assert pool.returned == [conn]
    assert pool.kwargs["max_size"] == 15


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
        connection_factory(Conn(Cursor([("one",)])), Conn(Cursor([])), Conn(Cursor(error=RuntimeError("insert")))),
    )
    inserted = gmail_queries.insert_staging_records("trace", [{"id": "1"}, {"id": "2"}, {"id": "3"}])
    assert inserted == []


def test_shared_query_helpers(monkeypatch):
    monkeypatch.setattr(std_queries, "get_connection", connection_factory(Conn(Cursor([("row",)]))))
    assert std_queries.get_encrypted_emails("trace", ["1"]) == [("row",)]
    assert std_queries.get_data_from_staging("trace", []) == []

    monkeypatch.setattr(std_queries, "get_connection", connection_factory(Conn(Cursor([("staged",)]))))
    assert std_queries.get_data_from_staging("trace", ["1"]) == [("staged",)]

    monkeypatch.setattr(
        std_queries,
        "get_connection",
        connection_factory(Conn(Cursor(error=RuntimeError("query")))),
    )
    assert std_queries.get_data_from_staging("trace", ["1"]) == []


def test_transfer_query_paths(monkeypatch):
    no_values = Conn(Cursor(rowcount=2))
    monkeypatch.setattr(transfer_query, "get_connection", connection_factory(no_values))
    assert transfer_query.execute_transfer_query("trace", "select 1") == {
        "status": "success",
        "rows_affected": 2,
    }
    assert no_values.commits == 1

    values = Conn(Cursor(rowcount=3))
    monkeypatch.setattr(transfer_query, "get_connection", connection_factory(values))
    assert transfer_query.execute_transfer_query("trace", "update", [("a",), ("b",)], commit=False) == {
        "status": "success",
        "rows_affected": 6,
    }
    assert values.commits == 0

    monkeypatch.setattr(
        transfer_query,
        "get_connection",
        connection_factory(Conn(Cursor(error=RuntimeError("query")))),
    )
    assert transfer_query.execute_transfer_query("trace", "bad") == {
        "status": "failure",
        "error": "query",
    }


def test_ner_task_orchestration_and_helpers(monkeypatch):
    real_decrypt_email_content = ner_tasks.decrypt_email_content
    real_normalized_emails_for_model = ner_tasks.normalized_emails_for_model
    real_run_ner_model = ner_tasks.run_ner_model
    monkeypatch.setattr(
        ner_tasks,
        "get_encrypted_emails",
        lambda *_args: (_ for _ in ()).throw(RuntimeError("fetch")),
    )
    assert ner_tasks.ner_task("trace", []) == {"status": "failure", "error": "fetch"}

    monkeypatch.setattr(ner_tasks, "get_encrypted_emails", lambda *_args: [])
    for name, error in [
        ("decrypt_email_content", "decrypt"),
        ("normalized_emails_for_model", "normalize"),
        ("run_ner_model", "model"),
        ("update_job_app_table", "update"),
    ]:
        monkeypatch.setattr(
            ner_tasks,
            name,
            lambda *_args, error=error: (_ for _ in ()).throw(RuntimeError(error)),
        )
        assert ner_tasks.ner_task("trace", []) == {"status": "failure", "error": error}
        monkeypatch.setattr(ner_tasks, name, lambda *_args: [])

    monkeypatch.setattr(ner_tasks, "update_job_app_table", lambda *_args: {"status": "updated"})
    assert ner_tasks.ner_task("trace", []) == {
        "status": "success",
        "results": {"status": "updated"},
    }

    monkeypatch.setattr(ner_tasks, "decrypt_token", lambda value: value.decode())
    assert real_decrypt_email_content(
        "trace",
        [
            {"id": "1", "subject_enc": b"subject", "sender_enc": b"sender", "body_enc": b"body"},
            {"id": "bad"},
        ],
    ) == [{"id": "1", "subject": "subject", "sender": "sender", "body": "body"}]
    emails = [{"provider_message_id": "msg"}]
    assert real_normalized_emails_for_model("trace", emails) is emails
    assert real_run_ner_model("trace", emails) == ["msg"]


def test_llm_classifier_parse_and_validation():
    parsed = llm_classifier.parse_llm_classification_response(
        '{"category":"interview","confidence":0.82,'
        '"secondary_category":"application_received","secondary_confidence":0.2,'
        '"reason":"interview_request"}'
    )
    assert parsed["category"] == "INTERVIEW"
    assert parsed["secondary_category"] == "APPLICATION_RECEIVED"

    aliased = llm_classifier.parse_llm_classification_response(
        '{"category":"APPLICATION_REJECTION","confidence":0.9,'
        '"secondary_category":null,"secondary_confidence":0}'
    )
    assert aliased["category"] == "REJECTION"

    with pytest.raises(llm_classifier.EmailLLMClassifierError, match="Unsupported"):
        llm_classifier.parse_llm_classification_response(
            '{"category":"OTHER","confidence":0.9}'
        )

    with pytest.raises(llm_classifier.EmailLLMClassifierError, match="Unsupported"):
        llm_classifier.parse_llm_classification_response(
            '{"category":"RECRUITER_OUTREACH","confidence":0.9}'
        )

    with pytest.raises(llm_classifier.EmailLLMTransientError, match="malformed"):
        llm_classifier.parse_llm_classification_response(
            '{"category":INTERVIEW,"confidence":0.9}'
        )


def test_email_inference_result_mapping_and_review():
    email = {"id": "row", "provider_message_id": "msg"}
    item = class_tasks.build_llm_result_item(
        email,
        {
            "category": "REJECTION",
            "confidence": 0.91,
            "secondary_category": "INTERVIEW",
            "secondary_confidence": 0.1,
            "reason": "rejection",
        },
    )
    assert item["top_label"] == "rejected"
    assert item["second_label"] == "interview"

    assert class_tasks.build_llm_result_item(
        email,
        {
            "category": "UNKNOWN",
            "confidence": 0.99,
            "secondary_category": None,
            "secondary_confidence": 0,
        },
    ) is None


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

    monkeypatch.setattr(firebase_admin.auth, "verify_id_token", lambda token, **kwargs: (token, kwargs))
    token, kwargs = firebase_admin.verify_id_token("token")
    assert token == "token"
    assert kwargs == {"check_revoked": True, "clock_skew_seconds": 15}


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
    gmail_tasks.schedule_retry(types.SimpleNamespace(request=types.SimpleNamespace(retries=2)), "trace", ["one"], "uid", "token")
    assert retries[0]["countdown"] == 3.0


def test_gmail_task_dispatch_and_token_error(monkeypatch):
    real_get_access_token_from_refresh = gmail_tasks.get_access_token_from_refresh
    self = types.SimpleNamespace(
        request=types.SimpleNamespace(retries=0),
        retry=lambda **kwargs: (_ for _ in ()).throw(RuntimeError(str(kwargs.get("exc")))),
    )
    monkeypatch.setattr(gmail_tasks, "can_fetch_emails", lambda _uid: False)
    assert gmail_tasks.initial_sync(self, "user", "trace", "2026-01-01") is None

    monkeypatch.setattr(gmail_tasks, "can_fetch_emails", lambda _uid: True)
    monkeypatch.setattr(gmail_tasks, "get_refresh_token", lambda _uid: b"refresh")
    monkeypatch.setattr(gmail_tasks, "decrypt_token", lambda value: value.decode())
    monkeypatch.setattr(gmail_tasks, "get_access_token_from_refresh", lambda *_args: "access")
    monkeypatch.setattr(gmail_tasks, "fetch_message_ids", lambda *_args: ["one"])
    monkeypatch.setattr(gmail_tasks, "encrypt_token", lambda value: value.encode())
    delayed = []
    monkeypatch.setattr(gmail_tasks.fetch_content, "delay", lambda *args: delayed.append(args))
    gmail_tasks.initial_sync(self, "user", "trace", "2026-01-01")
    assert delayed

    monkeypatch.setattr(
        gmail_tasks.requests,
        "post",
        lambda *_args, **_kwargs: types.SimpleNamespace(status_code=400, text="bad"),
    )
    with pytest.raises(Exception, match="Failed to exchange"):
        real_get_access_token_from_refresh("refresh", "trace")


@pytest.mark.asyncio
async def test_ollama_stream_provider_paths(monkeypatch):
    class Response:
        def __init__(self, status_code=200, *, lines=(), text=""):
            self.status_code = status_code
            self.lines = lines
            self.text = text

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            return None

        async def aread(self):
            return self.text.encode()

        async def aiter_lines(self):
            for line in self.lines:
                yield line

        def raise_for_status(self):
            if self.status_code >= 400:
                raise RuntimeError("http")

    class Client:
        def __init__(self, response):
            self.response = response

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            return None

        def stream(self, *_args, **_kwargs):
            return self.response

    responses = deque(
        [
            Response(
                lines=[
                    "",
                    "not-json",
                    '{"message": {"content": "hello"}}',
                    '{"message": {"content": ""}}',
                    '{"done": true}',
                ]
            ),
            Response(404, text='{"error": "model not found"}'),
            Response(500, text='{"error": "requires more system memory"}'),
        ]
    )
    monkeypatch.setattr(providers.httpx, "AsyncClient", lambda **_kwargs: Client(responses.popleft()))
    provider = providers.OllamaResumeLLMProvider()

    chunks = [
        chunk
        async for chunk in provider.stream(
            system="system",
            messages=[],
            options={"keep_alive": "", "top_k": 10},
        )
    ]
    assert chunks == ["hello"]

    with pytest.raises(providers.ResumeLLMProviderUnavailable, match="ollama pull"):
        _ = [chunk async for chunk in provider.stream(system="system", messages=[])]
    with pytest.raises(providers.ResumeLLMProviderUnavailable, match="needs more memory"):
        _ = [chunk async for chunk in provider.stream(system="system", messages=[])]


@pytest.mark.asyncio
async def test_ollama_stream_network_error(monkeypatch):
    class Client:
        async def __aenter__(self):
            raise providers.httpx.ConnectError("down")

        async def __aexit__(self, *_args):
            return None

    monkeypatch.setattr(providers.httpx, "AsyncClient", lambda **_kwargs: Client())
    with pytest.raises(providers.ResumeLLMProviderUnavailable):
        _ = [
            chunk
            async for chunk in providers.OllamaResumeLLMProvider().stream(
                system="system",
                messages=[],
            )
        ]
