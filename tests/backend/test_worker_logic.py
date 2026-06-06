from __future__ import annotations

import base64
import json
import sys
import types

import pytest

from classification import class_queries, class_tasks
from classification import class_rules
from gmail import gmail_tasks
from shared_worker_library.utils.task_definitions import ClassificationModelResult


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


def test_classification_query_helpers(monkeypatch):
    assert class_queries.to_percent(None) is None
    assert class_queries.to_percent("0.42") == 42
    assert class_queries.to_percent("2") == 2
    assert class_queries.to_percent("bad") is None

    captured = {}

    def fake_execute_transfer_query(**kwargs):
        captured.update(kwargs)
        return {"status": "success", "rows_affected": 1}

    monkeypatch.setattr(class_queries, "execute_transfer_query", fake_execute_transfer_query)
    result = class_queries.update_job_app_table(
        "trace",
        ClassificationModelResult(
            applied=[
                {
                    "top_score": 0.9,
                    "second_score": 0.2,
                    "second_label": "interview",
                    "needs_review": False,
                    "provider_message_id": "msg-1",
                }
            ],
            interview=[],
            offer=[],
            accepted=[],
            rejected=[],
            retry=[],
        ),
    )

    assert result["status"] == "success"
    assert captured["values"][0] == ("Applied", 0.9, 0.2, "interview", False, "msg-1")
    assert class_queries.update_job_app_table(
        "trace",
        ClassificationModelResult([], [], [], [], [], []),
    ) == {"status": "no_updates"}

    monkeypatch.setattr(
        class_queries,
        "execute_transfer_query",
        lambda **_kwargs: {"status": "failure", "error": "database down"},
    )
    assert class_queries.update_job_app_table(
        "trace",
        ClassificationModelResult(
            applied=[{"provider_message_id": "msg-1"}],
            interview=[],
            offer=[],
            accepted=[],
            rejected=[],
            retry=[],
        ),
    ) == {"status": "failure", "error": "database down"}


def test_classification_normalizes_email_text_and_skips_bad_rows():
    normalized = class_tasks.normalized_emails_for_model(
        "trace",
        [
            {
                "id": "1",
                "subject": "Hello&nbsp;<b>World</b>",
                "sender": "Recruiter@Example.com",
                "body": "Visit https://example.com and email me@example.com",
                "provider_message_id": "msg-1",
            },
            {"id": "bad", "subject": "missing provider id"},
        ],
    )

    assert len(normalized) == 1
    assert normalized[0]["subject"] == "hello world"
    assert normalized[0]["sender"] == "email_address"
    assert "url" in normalized[0]["body"]
    assert "email_address" in normalized[0]["body"]


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("Your application received confirmation", "applied"),
        ("Interview scheduled for tomorrow", "interview"),
        ("Congratulations on your offer", "offer"),
        ("Your signed offer and start date confirmed", "accepted"),
        ("We are not moving forward", "rejected"),
        ("", None),
        ("generic update", None),
    ],
)
def test_classification_heuristics(text, expected):
    assert class_tasks.heuristic_labeling(text) == expected


@pytest.mark.parametrize(
    ("subject", "body", "expected"),
    [
        (
            "Application confirmation",
            "Thank you for applying. We received your application and we'll review your application soon.",
            "applied",
        ),
        (
            "Application successfully submitted",
            "Your application was successfully submitted. If selected for an interview we will contact you.",
            "applied",
        ),
        (
            "Application recieved",
            "We recieved your application and appreciate you applying to this role.",
            "applied",
        ),
        (
            "Application sent",
            "Your application has been sent and is now complete.",
            "applied",
        ),
        (
            "Interview invitation",
            "Please schedule an interview, select a time, and prepare for a phone screen.",
            "interview",
        ),
        (
            "Meeting request",
            "Please schedule a Zoom call for a telephone conversation with the hiring team.",
            "interview",
        ),
        (
            "Update on your application",
            "Unfortunately, we are not moving forward and you were not selected.",
            "rejected",
        ),
        (
            "Position closed",
            "The position has been filled internally and is no longer open to new applications.",
            "rejected",
        ),
        (
            "Anrok Application Update",
            "We have filled the position and are closing the role. We wish you the best in your job search.",
            "rejected",
        ),
        (
            "Offer letter",
            "We are pleased to offer you this role. Your offer letter includes compensation details.",
            "offer",
        ),
        (
            "Formal offer",
            "We would love to have you onboard and are extending a formal offer.",
            "offer",
        ),
        (
            "Welcome",
            "Welcome to the team. It is great to have you and onboarding starts next week.",
            "accepted",
        ),
    ],
)
def test_rule_classifier_matches_clear_stage(subject, body, expected):
    result = class_rules.classify_email_stage_by_rules(
        subject=subject.lower(),
        sender="recruiter",
        body=body.lower(),
        email_text=f"Subject: {subject.lower()} \nFrom: recruiter \nBody: {body.lower()}",
    )

    assert result["matched"] is True
    assert result["stage"] == expected
    assert result["raw"]["source"] == "rules"


def test_rule_classifier_corrections_and_low_confidence():
    selected = class_rules.classify_email_stage_by_rules(
        subject="application received",
        sender="recruiter",
        body="we received your application and if selected for an interview we will contact you",
        email_text="Subject: application received Body: we received your application and if selected for an interview we will contact you",
    )
    assert selected["matched"] is True
    assert selected["stage"] == "applied"
    assert selected["stage_scores"]["interview"] == 0.0

    ambiguous = class_rules.classify_email_stage_by_rules(
        subject="quick update",
        sender="recruiter",
        body="thanks for your time",
        email_text="Subject: quick update Body: thanks for your time",
    )
    assert ambiguous["matched"] is False
    assert ambiguous["stage"] is None
    assert ambiguous["raw"]["reason"] == "low_confidence_or_low_margin"


def test_run_classification_model_uses_rules_without_model_fallback():
    result = class_tasks.run_classification_model(
        "trace",
        [
            {
                "id": "rule-1",
                "subject": "application confirmation",
                "sender": "recruiter",
                "body": "thank you for applying we received your application and we'll review your application",
                "provider_message_id": "msg-rule",
            }
        ],
    )

    assert [item["email_id"] for item in result.applied] == ["rule-1"]
    assert result.applied[0]["stage_scores"]["applied"] >= class_rules.RULE_ACCEPT_THRESHOLD
    assert result.inference == []


def test_run_classification_model_routes_ambiguous_to_inference():
    result = class_tasks.run_classification_model(
        "trace",
        [
            {
                "id": "fallback-1",
                "subject": "quick update",
                "sender": "recruiter",
                "body": "thanks for your time",
                "provider_message_id": "msg-fallback",
            }
        ],
    )

    assert result.applied == []
    assert result.inference == [
            {
                "email_id": "fallback-1",
                "provider_message_id": "msg-fallback",
                "reason": "ambiguous_requires_inference",
            }
        ]


def test_run_classification_model_groups_rule_results():
    result = class_tasks.run_classification_model(
        "trace",
        [
            {"id": "id-1", "subject": "application received", "sender": "a", "body": "we received your application", "provider_message_id": "msg-1"},
            {"id": "id-2", "subject": "newsletter", "sender": "alerts", "body": "unsubscribe from this job alert digest", "provider_message_id": "msg-2"},
            {"id": "id-3", "subject": "interview", "sender": "a", "body": "schedule an interview and select a time for a zoom call", "provider_message_id": "msg-3"},
            {"id": "id-4", "subject": "quick update", "sender": "a", "body": "thanks for your time", "provider_message_id": "msg-4"},
        ],
    )

    assert len(result.applied) == 1
    assert len(result.interview) == 1
    assert result.not_job_related == [
        {
            "email_id": "id-2",
            "provider_message_id": "msg-2",
            "reason": "rule_not_job_related",
        },
        {
            "email_id": "id-4",
            "provider_message_id": "msg-4",
            "reason": "low_signal_requires_inference",
        },
    ]
    assert result.inference == []


def test_run_classification_model_covers_remaining_rule_labels():
    result = class_tasks.run_classification_model(
        "trace",
        [
            {"id": "offer", "subject": "offer letter", "sender": "", "body": "pleased to offer employment offer compensation", "provider_message_id": "offer"},
            {"id": "accepted", "subject": "welcome", "sender": "", "body": "welcome aboard welcome to the team onboarding", "provider_message_id": "accepted"},
            {"id": "rejected", "subject": "not selected", "sender": "", "body": "not moving forward position has been filled", "provider_message_id": "rejected"},
        ],
    )

    assert [item["email_id"] for item in result.offer] == ["offer"]
    assert [item["email_id"] for item in result.accepted] == ["accepted"]
    assert [item["email_id"] for item in result.rejected] == ["rejected"]
    assert result.retry == []


def test_classification_task_orchestration_paths(monkeypatch):
    no_rows = {
        "status": "success",
        "results": 0,
        "message": "No classification rows to process",
    }
    assert class_tasks.classification_task("trace", []) == no_rows

    assert class_tasks.classification_task("trace", ["row"], attempt=class_tasks.MAX_RETRIES + 1) == {
        "status": "failure",
        "result": "max_retries_exceeded",
    }

    monkeypatch.setattr(
        class_tasks,
        "get_encrypted_emails",
        lambda *_args: (_ for _ in ()).throw(RuntimeError("fetch")),
    )
    assert class_tasks.classification_task("trace", ["row"]) == {"status": "failure", "error": "fetch"}

    monkeypatch.setattr(class_tasks, "get_encrypted_emails", lambda *_args: [])
    assert class_tasks.classification_task("trace", ["row"]) == no_rows

    monkeypatch.setattr(class_tasks, "get_encrypted_emails", lambda *_args: [{"id": "row"}])
    monkeypatch.setattr(
        class_tasks,
        "decrypt_email_content",
        lambda *_args: (_ for _ in ()).throw(RuntimeError("decrypt")),
    )
    assert class_tasks.classification_task("trace", ["row"]) == {"status": "failure", "error": "decrypt"}

    monkeypatch.setattr(class_tasks, "decrypt_email_content", lambda *_args: [])
    assert class_tasks.classification_task("trace", ["row"]) == no_rows

    monkeypatch.setattr(class_tasks, "decrypt_email_content", lambda *_args: [{"id": "row"}])
    monkeypatch.setattr(
        class_tasks,
        "normalized_emails_for_model",
        lambda *_args: (_ for _ in ()).throw(RuntimeError("normalize")),
    )
    assert class_tasks.classification_task("trace", ["row"]) == {"status": "failure", "error": "normalize"}

    monkeypatch.setattr(class_tasks, "normalized_emails_for_model", lambda *_args: [])
    assert class_tasks.classification_task("trace", ["row"]) == no_rows

    monkeypatch.setattr(class_tasks, "normalized_emails_for_model", lambda *_args: [{"id": "row"}])
    monkeypatch.setattr(
        class_tasks,
        "run_classification_model",
        lambda *_args: (_ for _ in ()).throw(RuntimeError("model")),
    )
    assert class_tasks.classification_task("trace", ["row"]) == {"status": "failure", "error": "model"}

    empty = ClassificationModelResult([], [], [], [], [], [])
    monkeypatch.setattr(class_tasks, "run_classification_model", lambda *_args: empty)
    monkeypatch.setattr(
        class_tasks,
        "update_job_app_table",
        lambda *_args: {"status": "failure", "error": "database"},
    )
    assert class_tasks.classification_task("trace", ["row"]) == {"status": "failure", "error": "database"}

    monkeypatch.setattr(
        class_tasks,
        "update_job_app_table",
        lambda *_args: {"status": "success", "rows_affected": 2},
    )
    assert class_tasks.classification_task("trace", ["row"]) == {"status": "success", "results": 2}


def test_email_inference_transient_retry_uses_inference_queue(monkeypatch):
    monkeypatch.setattr(
        class_tasks,
        "get_encrypted_emails",
        lambda *_args: [{"id": "row", "provider_message_id": "msg"}],
    )
    monkeypatch.setattr(
        class_tasks,
        "decrypt_email_content",
        lambda *_args: [{"id": "row", "provider_message_id": "msg"}],
    )
    monkeypatch.setattr(
        class_tasks,
        "normalized_emails_for_model",
        lambda *_args: [
            {
                "id": "row",
                "subject": "subject",
                "sender": "sender",
                "body": "body",
                "provider_message_id": "msg",
            }
        ],
    )
    monkeypatch.setattr(
        class_tasks,
        "classify_email_with_ollama",
        lambda *_args: (_ for _ in ()).throw(class_tasks.EmailLLMTransientError("timeout")),
    )
    monkeypatch.setattr(
        class_tasks,
        "update_job_app_table",
        lambda *_args: {"status": "no_updates", "rows_affected": 0},
    )
    monkeypatch.setattr(class_tasks, "mark_staging_job_applications_for_review", lambda *_args: None)

    scheduled = {}
    monkeypatch.setattr(
        class_tasks.email_inference_task,
        "apply_async",
        lambda **kwargs: scheduled.update(kwargs),
    )

    result = class_tasks.email_inference_task("trace", ["row"])

    assert result["status"] == "success"
    assert result["retry"] == 1
    assert scheduled["args"] == ["trace", ["row"], 2]
    assert scheduled["queue"] == class_tasks.TaskType.EMAIL_INFERENCE.queue_name


def test_email_inference_fetch_failure_schedules_retry_on_inference_queue(monkeypatch):
    monkeypatch.setattr(
        class_tasks,
        "get_encrypted_emails",
        lambda *_args: (_ for _ in ()).throw(RuntimeError("db down")),
    )

    scheduled = {}
    monkeypatch.setattr(
        class_tasks.email_inference_task,
        "apply_async",
        lambda **kwargs: scheduled.update(kwargs),
    )

    result = class_tasks.email_inference_task("trace", ["row"])

    assert result["status"] == "retry_scheduled"
    assert result["retry"] == 1
    assert scheduled["args"] == ["trace", ["row"], 2]
    assert scheduled["queue"] == class_tasks.TaskType.EMAIL_INFERENCE.queue_name


def test_requeue_stale_email_inference_task(monkeypatch):
    monkeypatch.setattr(
        class_tasks,
        "get_stale_processing_staging_row_ids",
        lambda *_args, **_kwargs: ["row-1", "row-2"],
    )

    sent = {}
    monkeypatch.setattr(
        class_tasks.celery_app,
        "send_task",
        lambda *args, **kwargs: sent.update({"args": args, "kwargs": kwargs}),
    )

    result = class_tasks.requeue_stale_email_inference_task("trace")

    assert result == {"status": "success", "queued": 2}
    assert sent["args"][0] == class_tasks.TaskType.EMAIL_INFERENCE.task_name
    assert sent["kwargs"]["args"] == ["trace", ["row-1", "row-2"]]
    assert sent["kwargs"]["queue"] == class_tasks.TaskType.EMAIL_INFERENCE.queue_name


def test_gmail_parsing_helpers_and_payload(monkeypatch):
    assert gmail_tasks._get_header([{"name": "Subject", "value": "Hi"}], "subject") == "Hi"
    assert gmail_tasks._get_header([], "subject") == ""

    encoded = base64.urlsafe_b64encode(b"plain body").decode("ascii")
    assert gmail_tasks._decode_gmail_body(encoded) == "plain body"
    assert gmail_tasks.strip_html("<p>Hello</p>") == "Hello"
    assert gmail_tasks.extract_plain_text_from_payload({"mimeType": "text/plain", "body": {"data": encoded}}) == "plain body"
    assert gmail_tasks.extract_plain_text_from_payload({"parts": [{"mimeType": "text/html", "body": {"data": base64.urlsafe_b64encode(b"<b>HTML</b>").decode("ascii")}}]}) == "HTML"
    assert gmail_tasks.extract_plain_text_from_payload({"parts": [{"parts": [{"mimeType": "text/plain", "body": {"data": encoded}}]}]}) == "plain body"
    assert gmail_tasks.extract_plain_text_from_payload({"parts": []}, depth=11) == ""

    parsed = gmail_tasks.parse_successful_fetches(
        "trace",
        [
            {
                "msg_id": "m1",
                "response": {
                    "id": "m1",
                    "threadId": "t1",
                    "historyId": "h1",
                    "internalDate": "123",
                    "payload": {
                        "headers": [
                            {"name": "Subject", "value": "Job"},
                            {"name": "From", "value": "recruiter"},
                            {"name": "To", "value": "me"},
                        ],
                        "mimeType": "text/plain",
                        "body": {"data": encoded},
                    },
                },
            },
            {"msg_id": "bad", "response": None},
        ],
        "user-123",
    )
    assert parsed[0]["body_text"] == "plain body"
    assert len(parsed) == 1

    assert gmail_tasks._classify_error(Exception("404 notFound")) == "SKIP"
    assert gmail_tasks._classify_error(Exception("rateLimitExceeded 429")) == "RETRY"
    assert gmail_tasks._classify_error(Exception("503")) == "RETRY"
    assert gmail_tasks._classify_error(Exception("weird")) == "SKIP"
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


def test_gmail_history_helpers_and_pubsub_listener(monkeypatch):
    monkeypatch.setattr(gmail_tasks, "GMAIL_PUBSUB_PROJECT_ID", "project-1")
    monkeypatch.setattr(gmail_tasks, "GMAIL_PUBSUB_TOPIC", "topic-1")
    assert gmail_tasks._topic_name() == "projects/project-1/topics/topic-1"
    monkeypatch.setattr(
        gmail_tasks,
        "GMAIL_PUBSUB_TOPIC",
        "projects/project-2/topics/topic-2",
    )
    assert gmail_tasks._topic_name() == "projects/project-2/topics/topic-2"

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

    class Request:
        def __init__(self, data):
            self.data = data

        def execute(self):
            return self.data

    class History:
        def __init__(self):
            self.calls = 0

        def list(self, **kwargs):
            self.calls += 1
            assert kwargs["startHistoryId"] == "10"
            if self.calls == 1:
                return Request(
                    {
                        "historyId": "11",
                        "history": [{"messagesAdded": [{"message": {"id": "m1"}}]}],
                        "nextPageToken": "next",
                    }
                )
            return Request(
                {
                    "historyId": "12",
                    "history": [{"messagesAdded": [{"message": {"id": "m2"}}]}],
                }
            )

    class Users:
        def __init__(self):
            self.history_obj = History()

        def history(self):
            return self.history_obj

    class Service:
        def __init__(self):
            self.users_obj = Users()

        def users(self):
            return self.users_obj

    monkeypatch.setattr(gmail_tasks, "build_gmail_service", lambda _token: Service())
    ids, latest = gmail_tasks.fetch_history_message_ids("token", "trace", "10")
    assert ids == ["m1", "m2"]
    assert latest == "12"

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
