from __future__ import annotations

import base64
import types

import pandas as pd
import pytest

from classification import class_queries, class_tasks
from classification import class_model
from gmail import gmail_tasks
from relevance import relevance_norm, relevance_tasks
from shared_worker_library.utils.task_definitions import ClassificationModelResult, RelevanceModelResult


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


def test_run_classification_model_groups_review_and_retry(monkeypatch):
    outputs = {
        "1": {"stage": "applied", "score": 0.95, "second_stage": "interview", "second_score": 0.2, "stage_scores": {"applied": 0.95}},
        "2": {"stage": "applied", "score": 0.55, "second_stage": "interview", "second_score": 0.51, "stage_scores": {"applied": 0.55}},
        "3": {"stage": "applied", "score": 0.9, "second_stage": "interview", "second_score": 0.8, "stage_scores": {"applied": 0.9}},
    }

    def fake_classify(text):
        if "id-err" in text:
            raise RuntimeError("model down")
        for key, value in outputs.items():
            if f"id-{key}" in text:
                return value
        return outputs["1"]

    monkeypatch.setattr(class_tasks, "classify_email_stage", fake_classify)
    result = class_tasks.run_classification_model(
        "trace",
        [
            {"id": "id-1", "subject": "id-1", "sender": "a", "body": "application received", "provider_message_id": "msg-1"},
            {"id": "id-2", "subject": "id-2", "sender": "a", "body": "body", "provider_message_id": "msg-2"},
            {"id": "id-3", "subject": "id-3", "sender": "a", "body": "schedule an interview", "provider_message_id": "msg-3"},
            {"id": "id-err", "subject": "id-err", "sender": "a", "body": "body", "provider_message_id": "msg-4"},
        ],
    )

    assert len(result.applied) == 2
    assert result.applied[1]["needs_review"] is True
    assert len(result.interview) == 1
    assert result.interview[0]["needs_review"] is True
    assert result.retry == [{"email_id": "id-err"}]


def test_class_model_classifier_output_shapes(monkeypatch):
    labels = list(class_model.CANDIDATE_LABELS[:2])
    monkeypatch.setattr(
        class_model,
        "CLASSIFIER",
        lambda *_args, **_kwargs: {"labels": labels, "scores": [0.7, 0.3]},
    )
    result = class_model.classify_email_stage("body")
    assert result["score"] == 0.7
    assert result["second_score"] == 0.3

    monkeypatch.setattr(
        class_model,
        "CLASSIFIER",
        lambda *_args, **_kwargs: [{"labels": labels, "scores": [0.6, 0.4]}],
    )
    assert class_model.classify_email_stage("body")["score"] == 0.6

    def generator():
        yield {"labels": labels, "scores": [0.8, 0.2]}

    monkeypatch.setattr(class_model, "CLASSIFIER", lambda *_args, **_kwargs: generator())
    assert class_model.classify_email_stage("body")["score"] == 0.8

    monkeypatch.setattr(class_model, "CLASSIFIER", None)
    with pytest.raises(RuntimeError):
        class_model.get_classifier()


def test_relevance_text_normalization_and_redaction_layers(monkeypatch):
    assert relevance_norm.normalize_text_block(" Hi,\nTHERE!! ") == "hi there"
    assert relevance_norm.normalize_text_block(123) == ""
    assert relevance_norm.strip_html("<script>x</script><p>Hello</p><style>y</style>") == "Hello"
    assert relevance_norm.normalize_text("<b>Hello!</b>") == "hello"

    text = (
        "Email user@example.com phone 212-555-1212 ssn 123-45-6789 "
        "card 4111 1111 1111 1111 ip 192.168.1.1 url https://example.com "
        "uuid 123e4567-e89b-12d3-a456-426614174000 @handle"
    )
    redacted, counts = relevance_norm._redact_pii_regex(text)
    assert "[EMAIL]" in redacted
    assert counts["EMAIL"] == 1
    assert counts["PHONE"] == 1

    df = pd.DataFrame([{"body": text}])
    layer_one, layer_one_counts = relevance_norm.layer_one_pii_redaction(df)
    assert "[EMAIL]" in layer_one.loc[0, "body"]
    assert layer_one_counts["PHONE"] == 1

    assert relevance_norm._entropy("aaaaaaaa") == 0
    keyed, key_counts = relevance_norm.redact_keys(
        "api_key = abcdefghijklmnopqrstuvwxyz123456\n"
        "AKIA1234567890ABCDEF token=ABCDabcd1234ABCDabcd1234ABCD"
    )
    assert "[SECRET] = [SECRET]" in keyed
    assert key_counts["[API_KEY]"] == 1
    assert key_counts["[AWS_KEY_ID]"] == 1
    assert key_counts["[SECRET]"] >= 1

    money_df, money_count = relevance_norm.layer_money_redaction(pd.DataFrame([{"body": "$25.50 and EUR 10K"}]))
    assert money_count == 2
    assert money_df.loc[0, "body"].count("[MONEY]") == 2

    numbered, num_count = relevance_norm._red_num("10K 25% 3.5 1st")
    assert "[NUM]K" in numbered
    assert "[NUM]%" in numbered
    assert "1st" in numbered
    assert num_count == 3

    tokened, token_count = relevance_norm._red_token("abc123 1st plain")
    assert tokened.startswith("[TOKEN]")
    assert token_count == 1

    counts_total = relevance_norm._init_final_counts()
    relevance_norm._merge_counts(counts_total, {"[JWT]": 2, "UNKNOWN": 9})
    assert counts_total["JWT"] == 2

    with pytest.raises(ValueError, match="missing required columns"):
        relevance_norm.strip_pii(pd.DataFrame([{"subject": "x"}]))

    def fake_layer_two(input_df):
        return input_df, {"PERSON": 1}

    monkeypatch.setattr(relevance_norm, "layer_two_ner_redaction", fake_layer_two)
    stripped, final_counts = relevance_norm.strip_pii(pd.DataFrame([{"body": "Jane paid $50 for api_key=abcdefghijklmnopqrstuvwx"}]))
    assert "jane paid money for api key api key" in stripped.loc[0, "body"]
    assert final_counts["PERSON"] == 1


def test_relevance_tasks_split_predictions_and_enqueue(monkeypatch):
    predictions = pd.DataFrame(
        [
            {"id": "1", "prediction": 1, "job_probability": 0.91},
            {"id": "2", "prediction": 0, "job_probability": 0.1},
        ]
    )
    monkeypatch.setattr(relevance_tasks, "predict", lambda emails: predictions)
    result = relevance_tasks.run_relevance_model("trace", pd.DataFrame([{"id": "1"}, {"id": "2"}]))
    assert result.relevant == {"1": 0.91}
    assert result.purge == ["2"]

    monkeypatch.setattr(relevance_tasks, "predict", lambda emails: (_ for _ in ()).throw(RuntimeError("down")))
    failed = relevance_tasks.run_relevance_model("trace", pd.DataFrame([{"id": "1"}, {"id": "2"}]))
    assert failed.retry == ["1", "2"]

    sent = []
    retries = []
    monkeypatch.setattr(relevance_tasks.celery_app, "send_task", lambda *args, **kwargs: sent.append((args, kwargs)))
    monkeypatch.setattr(relevance_tasks.relevance_task, "apply_async", lambda *args, **kwargs: retries.append((args, kwargs)))
    enqueue_result = relevance_tasks.enqueue(
        "trace",
        RelevanceModelResult(relevant={"1": 0.9}, retry=["2"], purge=["3"]),
        attempt=2,
    )
    assert enqueue_result == {"relevant": ["1"], "retry": ["2"], "purge": ["3"], "attempt_next": 3}
    assert sent
    assert retries[0][1]["countdown"] == 120


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
    assert payload[0]["status"] == "AWAIT_RELEVANCE"


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
