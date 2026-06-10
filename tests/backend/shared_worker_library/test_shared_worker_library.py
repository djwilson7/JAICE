"""Tests for the shared_worker_library domain.

Covers: shared_worker_library.database,
        shared_worker_library.db_queries.job_application_queries,
        shared_worker_library.db_queries.std_queries,
        shared_worker_library.db_queries.transfer_query,
        shared_worker_library.utils.task_definitions,
        shared_worker_library.utils.to_bytes
"""
from __future__ import annotations

import importlib
import os
import types
from collections import deque
from contextlib import contextmanager

import pytest

from shared_worker_library import database
from shared_worker_library.db_queries import job_application_queries, std_queries, transfer_query
from shared_worker_library.utils import to_bytes
from shared_worker_library.utils.task_definitions import (
    ClassificationModelResult,
    EmailStage,
    EmailStatus,
    TaskType,
)
from common.security import encrypt_token
from common.job_application_crypto import decrypt_job_application_value


# ---------------------------------------------------------------------------
# Helpers
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


# ---------------------------------------------------------------------------
# utils.to_bytes
# ---------------------------------------------------------------------------

def test_to_bytes_converts_memoryview_and_postgres_hex():
    assert to_bytes.to_bytes(memoryview(b"abc")) == b"abc"
    assert to_bytes.to_bytes("\\x616263") == b"abc"
    assert to_bytes.to_bytes(b"raw") == b"raw"
    assert to_bytes.to_bytes(None) is None


# ---------------------------------------------------------------------------
# utils.task_definitions
# ---------------------------------------------------------------------------

def test_task_definitions_expose_expected_metadata():
    assert TaskType.INITIAL_SYNC.task_name == "gmail.initial_sync"
    assert TaskType.CLASSIFICATION_MODEL.queue_name == "classification_model_queue"
    assert EmailStatus.AWAIT_CLASSIFICATION.value == "AWAIT_CLASSIFICATION"
    assert EmailStage.INTERVIEW.value == "Interview"

    classification = ClassificationModelResult(
        applied=[{"id": 1}],
        interview=[],
        offer=[],
        accepted=[],
        rejected=[],
        retry=[],
    )
    assert classification.applied[0]["id"] == 1


# ---------------------------------------------------------------------------
# database — pool and connection
# ---------------------------------------------------------------------------

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


def test_worker_database_missing_url_guard(monkeypatch):
    worker_url = os.environ["WORKER_DATABASE_URL"]
    monkeypatch.delenv("WORKER_DATABASE_URL")
    try:
        with pytest.raises(ValueError, match="WORKER_DATABASE_URL"):
            importlib.reload(database)
    finally:
        monkeypatch.setenv("WORKER_DATABASE_URL", worker_url)
        importlib.reload(database)


# ---------------------------------------------------------------------------
# db_queries.std_queries
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# db_queries.transfer_query
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# db_queries.job_application_queries
# ---------------------------------------------------------------------------

def test_processing_placeholder_encrypts_public_job_content(monkeypatch):
    captured = {}

    monkeypatch.setattr(
        job_application_queries,
        "get_data_from_staging",
        lambda *_args: [
            (
                "staging-1",
                encrypt_token("user-1"),
                "trace",
                "gmail",
                "provider-1",
                encrypt_token("Application update"),
                encrypt_token("Recruiting <jobs@example.com>"),
                "2026-06-08T00:00:00Z",
                encrypt_token("Private email body"),
                None,
                None,
            )
        ],
    )
    monkeypatch.setattr(
        job_application_queries,
        "execute_transfer_query",
        lambda **kwargs: captured.update(kwargs) or {"status": "success", "rows_affected": 1},
    )

    result = job_application_queries.insert_processing_placeholders_from_staging(
        "trace",
        ["staging-1"],
    )

    assert result == {"status": "success", "rows_affected": 1}
    assert "title_enc" in captured["query"]
    assert "description_enc" in captured["query"]
    assert "title," not in captured["query"]

    values = captured["values"][0]
    assert isinstance(values[1], bytes)
    assert isinstance(values[3], bytes)
    assert decrypt_job_application_value(values[1]) == "Application update"
    assert decrypt_job_application_value(values[3]) == "Private email body"
    assert decrypt_job_application_value(values[7]) == "Recruiting <jobs@example.com>"

    # Test error and empty conditions
    assert job_application_queries.insert_processing_placeholders_from_staging("trace", []) == {"status": "no_data", "rows_affected": 0}
    
    monkeypatch.setattr(job_application_queries, "get_data_from_staging", lambda *args: [])
    assert job_application_queries.insert_processing_placeholders_from_staging("trace", ["s1"]) == {"status": "no_data", "rows_affected": 0}
    
    def failing_decrypt(_value):
        raise RuntimeError("fail")
    monkeypatch.setattr(job_application_queries, "get_data_from_staging", lambda *args: [("row-id", b"uid", "trace", "gmail", "msg-id", b"subject", b"sender", "time", b"body", "thread-id", "history-id")])
    monkeypatch.setattr(job_application_queries, "decrypt_token", failing_decrypt)
    assert job_application_queries.insert_processing_placeholders_from_staging("trace", ["one"]) == {"status": "no_data", "rows_affected": 0}

def test_delete_staging_job_applications(monkeypatch):
    assert job_application_queries.delete_staging_job_applications("trace", []) == {"status": "no_updates", "rows_affected": 0}
    
    captured = {}
    monkeypatch.setattr(
        job_application_queries,
        "execute_transfer_query",
        lambda **kwargs: captured.update(kwargs) or {"status": "success", "rows_affected": 1},
    )
    res = job_application_queries.delete_staging_job_applications("trace", ["m1"])
    assert "DELETE FROM public.job_applications" in captured["query"]
    assert captured["values"] == [("m1",)]

def test_mark_staging_job_applications_for_review(monkeypatch):
    assert job_application_queries.mark_staging_job_applications_for_review("trace", []) == {"status": "no_updates", "rows_affected": 0}
    
    captured = {}
    monkeypatch.setattr(
        job_application_queries,
        "execute_transfer_query",
        lambda **kwargs: captured.update(kwargs) or {"status": "success", "rows_affected": 1},
    )
    res = job_application_queries.mark_staging_job_applications_for_review("trace", ["m1"])
    assert "UPDATE public.job_applications" in captured["query"]
    assert captured["values"] == [("m1",)]

def test_get_stale_processing_staging_row_ids(monkeypatch):
    monkeypatch.setattr(
        job_application_queries,
        "get_connection",
        connection_factory(Conn(Cursor([("row1",), ("row2",)]))),
    )
    res = job_application_queries.get_stale_processing_staging_row_ids("trace", 30, 10)
    assert res == ["row1", "row2"]
    
    monkeypatch.setattr(
        job_application_queries,
        "get_connection",
        connection_factory(Conn(Cursor(error=RuntimeError("db err")))),
    )
    res2 = job_application_queries.get_stale_processing_staging_row_ids("trace", 30, 10)
    assert res2 == []

