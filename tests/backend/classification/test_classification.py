"""Tests for the classification domain.

Covers: classification.class_queries, classification.class_rules,
        classification.class_tasks, classification.llm_classifier
"""
from __future__ import annotations

import pytest

from classification import class_queries, class_tasks, class_rules, llm_classifier
from shared_worker_library.utils.task_definitions import ClassificationModelResult


# ---------------------------------------------------------------------------
# class_queries
# ---------------------------------------------------------------------------

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


def test_classification_query_failure_path(monkeypatch):
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


# ---------------------------------------------------------------------------
# class_tasks — email decryption and normalisation
# ---------------------------------------------------------------------------

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
    assert "https://example.com" not in normalized[0]["body"]
    assert "email_address" in normalized[0]["body"]


def test_classification_normalizes_none_fields():
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


def test_classification_formats_html_body_before_rule_matching():
    normalized = class_tasks.normalized_emails_for_model(
        "trace",
        [
            {
                "id": "html-application",
                "subject": "Update",
                "sender": "no-reply@example.com",
                "body": """
                    <html>
                      <body>
                        <p>Thank you for applying.</p>
                        <p>We received your application and we'll review your application soon.</p>
                        <a href="https://example.com/jobs/123">Software Engineer at Kalderos</a>
                        <a href="https://tracking.example.com/status">View application status</a>
                      </body>
                    </html>
                """,
                "provider_message_id": "msg-html",
            },
        ],
    )

    assert normalized[0]["body"] == (
        "thank you for applying. we received your application and we'll "
        "review your application soon. software engineer at kalderos "
        "view application status"
    )

    result = class_tasks.run_classification_model("trace", normalized)
    assert [item["email_id"] for item in result.applied] == ["html-application"]
    assert result.not_job_related == []


# ---------------------------------------------------------------------------
# class_tasks — heuristics and model routing
# ---------------------------------------------------------------------------

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
    assert result.inference == []


def test_run_classification_model_filters_marketing_alert_subjects():
    result = class_tasks.run_classification_model(
        "trace",
        [
            {
                "id": "marketing-1",
                "subject": "New job matches for you",
                "sender": "LinkedIn Jobs",
                "body": "See the positions selected for you.",
                "provider_message_id": "msg-marketing",
            }
        ],
    )
    assert result.applied == []
    assert result.inference == []
    assert result.not_job_related == [
        {
            "email_id": "marketing-1",
            "provider_message_id": "msg-marketing",
            "reason": "rule_job_alert_marketing",
        }
    ]


def test_run_classification_model_filters_marketing_apply_cta():
    result = class_tasks.run_classification_model(
        "trace",
        [
            {
                "id": "marketing-apply",
                "subject": "This role could be a match",
                "sender": "Indeed <alert@indeed.com>",
                "body": "Review this recommended job and Quick Apply with your profile.",
                "provider_message_id": "msg-marketing-apply",
            }
        ],
    )
    assert result.applied == []
    assert result.inference == []
    assert result.not_job_related == [
        {
            "email_id": "marketing-apply",
            "provider_message_id": "msg-marketing-apply",
            "reason": "rule_job_board_marketing",
        }
    ]


def test_run_classification_model_filters_generic_quick_updates():
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
    assert result.inference == []
    assert result.not_job_related == [
        {
            "email_id": "fallback-1",
            "provider_message_id": "msg-fallback",
            "reason": "rule_generic_job_without_lifecycle",
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
        {"email_id": "id-2", "provider_message_id": "msg-2", "reason": "rule_content_marketing"},
        {"email_id": "id-4", "provider_message_id": "msg-4", "reason": "rule_generic_job_without_lifecycle"},
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


@pytest.mark.parametrize(
    ("subject", "sender", "body"),
    [
        (
            "Important information about your application to Backstroke",
            "careers@highalpha.com",
            (
                "Thank you for the time and effort you dedicated to your application "
                "for the Software Engineer at Backstroke. After careful consideration, "
                "we've decided to move forward with other candidates at this time."
            ),
        ),
        (
            "An update on your application for Senior Software Engineer at Mastercard",
            "MasterCard People Services <mastercard@myworkday.com>",
            (
                "Thank you for applying to the Senior Software Engineer position. "
                "We've decided to move forward with other candidates whose expertise "
                "more closely aligns with our needs at this time."
            ),
        ),
    ],
)
def test_run_classification_model_keeps_clear_rejections_out_of_review(subject, sender, body):
    result = class_tasks.run_classification_model(
        "trace",
        [
            {
                "id": "rejection",
                "subject": subject,
                "sender": sender,
                "body": body,
                "provider_message_id": "msg-rejection",
            }
        ],
    )
    assert result.applied == []
    assert result.inference == []
    assert len(result.rejected) == 1
    assert result.rejected[0]["top_label"] == "rejected"
    assert result.rejected[0]["needs_review"] is False


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


# ---------------------------------------------------------------------------
# class_tasks — LLM inference result mapping
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# class_rules
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    ("subject", "body", "expected"),
    [
        (
            "Application confirmation",
            "Thank you for applying. We received your application and we'll review your application soon.",
            "applied",
        ),
        (
            "Interview invitation",
            "Please schedule an interview, select a time, and prepare for a phone screen.",
            "interview",
        ),
        (
            "Update on your application",
            "Unfortunately, we are not moving forward and you were not selected.",
            "rejected",
        ),
        (
            "Offer letter",
            "We are pleased to offer you this role. Your offer letter includes compensation details.",
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


@pytest.mark.parametrize(
    "subject",
    [
        "Find your dream job",
        "Your dream job is waiting",
        "New job",
        "12 new jobs for you",
        "New match",
        "You have new matches",
        "New position available",
        "New roles selected for you",
        "Recommended positions for you",
        "Jobs you may like",
    ],
)
def test_rule_classifier_filters_marketing_alert_subjects(subject):
    result = class_rules.classify_email_by_rules(
        subject=subject,
        sender="LinkedIn Jobs <jobs-noreply@linkedin.com>",
        body="Review this recommendation and unsubscribe from future alerts.",
        email_text=f"Subject: {subject} Body: Review this recommendation.",
    )
    assert result["matched"] is True
    assert result["relevant"] is False
    assert result["category"] == "NOT_JOB_RELATED"
    assert result["stage"] is None
    assert result["requires_inference"] is False
    assert result["reason"] in {"rule_job_alert_marketing", "rule_content_marketing"}


@pytest.mark.parametrize(
    "marketing_text",
    [
        "Do you want to get more jobs like this?",
        "Keep your profile up to date to receive better recommendations.",
        "You received this job match email based on your profile.",
        "Apply Now",
        "Apply on website",
        "Apply with your profile",
        "Quick Apply",
    ],
)
def test_rule_classifier_filters_marketing_ctas_anywhere_in_body(marketing_text):
    result = class_rules.classify_email_by_rules(
        subject="Software Engineer opportunity",
        sender="Job Recommendations <alerts@example.com>",
        body=(
            "This role could be a match for your experience. "
            f"{marketing_text} We are reviewing applications."
        ),
        email_text=(
            "Body: This role could be a match for your experience. "
            f"{marketing_text} We are reviewing applications."
        ),
    )
    assert result["matched"] is True
    assert result["relevant"] is False
    assert result["category"] == "NOT_JOB_RELATED"


def test_indeed_application_match_disclaimer_remains_applied():
    result = class_rules.classify_email_by_rules(
        subject="Your application to Example Corp was sent",
        sender="Indeed Applications <applications@indeed.com>",
        body=(
            "Your application was sent to Example Corp. If your application "
            "could be a match, the employer will follow up with you."
        ),
        email_text=(
            "Subject: Your application to Example Corp was sent. "
            "Body: Your application was sent to Example Corp. If your "
            "application could be a match, the employer will follow up with you."
        ),
    )
    assert result["matched"] is True
    assert result["relevant"] is True
    assert result["category"] == "APPLICATION_RECEIVED"
    assert result["stage"] == "applied"
    assert result["reason"] == "rule_hard_lifecycle_match"


def test_bad_match_language_without_indeed_sender_is_not_marketing_override():
    result = class_rules.classify_email_by_rules(
        subject="Update on your application",
        sender="Recruiter <recruiter@example.com>",
        body="This is not a good match, so we are not moving forward.",
        email_text="Body: This is not a good match, so we are not moving forward.",
    )
    assert result["category"] == "REJECTION"
    assert result["stage"] == "rejected"
    assert result["relevant"] is True


def test_important_application_information_rejection_is_classified():
    result = class_rules.classify_email_by_rules(
        subject="Important information about your application",
        sender="Hiring Team <no-reply@example.com>",
        body=(
            "Thank you for your interest. Unfortunately, we have decided "
            "to move forward with other candidates."
        ),
        email_text=(
            "Subject: Important information about your application "
            "Body: Unfortunately, we have decided to move forward with other candidates."
        ),
    )
    assert result["matched"] is True
    assert result["relevant"] is True
    assert result["category"] == "REJECTION"
    assert result["stage"] == "rejected"


def test_important_application_information_without_stage_routes_to_inference():
    result = class_rules.classify_email_by_rules(
        subject="Important information regarding your application",
        sender="notifications@example.com",
        body="Please sign in to review this important update.",
        email_text=(
            "Subject: Important information regarding your application "
            "Body: Please sign in to review this important update."
        ),
    )
    assert result["matched"] is False
    assert result["relevant"] is True
    assert result["requires_inference"] is True
    assert result["reason"] == "rule_ambiguous_lifecycle_requires_inference"


@pytest.mark.parametrize(
    ("subject", "sender", "body", "reason"),
    [
        (
            "Inside Outlier: what our experts are building",
            "Outlier <news@outlier.ai>",
            "Read more from the Outlier blog about AI training work and platform updates.",
            "rule_content_marketing",
        ),
        (
            "Now hiring: AI trainers",
            "Outlier <jobs@outlier.ai>",
            "We are hiring remote contributors. Apply now to start earning.",
            "rule_job_alert_marketing",
        ),
        (
            "Senior Software Engineer opportunity",
            "Indeed <alert@indeed.com>",
            "This company is hiring now. View open roles and apply today.",
            "rule_job_board_marketing",
        ),
        (
            "Role that may interest you",
            "Recruiter <recruiter@example.com>",
            "I found a role that may interest you and would like to connect.",
            "rule_generic_job_without_lifecycle",
        ),
    ],
)
def test_rule_classifier_blocks_job_marketing_and_generic_outreach(subject, sender, body, reason):
    result = class_rules.classify_email_by_rules(
        subject=subject,
        sender=sender,
        body=body,
        email_text=f"Subject: {subject} From: {sender} Body: {body}",
    )
    assert result["matched"] is True
    assert result["relevant"] is False
    assert result["category"] == "NOT_JOB_RELATED"
    assert result["requires_inference"] is False
    assert result["reason"] == reason


# ---------------------------------------------------------------------------
# llm_classifier — parse and validation
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Additional coverage expansion tests
# ---------------------------------------------------------------------------

def test_timeout_seconds_value_error(monkeypatch):
    monkeypatch.setenv("EMAIL_LLM_TIMEOUT_SECONDS", "invalid")
    assert llm_classifier._timeout_seconds() == 45.0


def test_timeout_seconds_valid_float(monkeypatch):
    monkeypatch.setenv("EMAIL_LLM_TIMEOUT_SECONDS", "15.5")
    assert llm_classifier._timeout_seconds() == 15.5


def test_extract_json_no_braces():
    with pytest.raises(llm_classifier.EmailLLMTransientError, match="did not contain JSON"):
        llm_classifier.parse_llm_classification_response("plain text with no json")


def test_extract_json_non_object():
    with pytest.raises(llm_classifier.EmailLLMTransientError, match="must be an object"):
        llm_classifier.parse_llm_classification_response("[1, 2, 3]")


def test_unsupported_secondary_category():
    with pytest.raises(llm_classifier.EmailLLMClassifierError, match="Unsupported LLM secondary category"):
        llm_classifier.parse_llm_classification_response(
            '{"category": "INTERVIEW", "confidence": 0.9, "secondary_category": "INVALID_CAT"}'
        )


def test_non_numeric_confidence():
    with pytest.raises(llm_classifier.EmailLLMClassifierError, match="must be numeric"):
        llm_classifier.parse_llm_classification_response(
            '{"category": "INTERVIEW", "confidence": "high"}'
        )


def test_classify_email_with_ollama_success(monkeypatch):
    class MockResponse:
        def raise_for_status(self):
            pass
        def json(self):
            return {"message": {"content": '{"category": "INTERVIEW", "confidence": 0.85}'}}
    
    captured_post = []
    def mock_post(url, json, timeout):
        captured_post.append((url, json, timeout))
        return MockResponse()
    
    monkeypatch.setattr(llm_classifier.requests, "post", mock_post)
    monkeypatch.setenv("EMAIL_LLM_KEEP_ALIVE", "5m")
    monkeypatch.setenv("EMAIL_LLM_NUM_PREDICT", "180")
    
    res = llm_classifier.classify_email_with_ollama("Test email body")
    assert res["category"] == "INTERVIEW"
    assert res["confidence"] == 0.85
    assert res["provider"] == "ollama"
    assert len(captured_post) == 1
    url, payload, timeout = captured_post[0]
    assert payload["keep_alive"] == "5m"
    assert payload["options"]["num_predict"] == 180


def test_classify_email_with_ollama_empty_content(monkeypatch):
    class MockResponse:
        def raise_for_status(self):
            pass
        def json(self):
            return {"message": {"content": ""}}
    monkeypatch.setattr(llm_classifier.requests, "post", lambda *args, **kwargs: MockResponse())
    with pytest.raises(llm_classifier.EmailLLMClassifierError, match="empty classification"):
        llm_classifier.classify_email_with_ollama("Test email body")


def test_classify_email_with_ollama_request_exception(monkeypatch):
    def mock_post(*args, **kwargs):
        raise llm_classifier.requests.RequestException("Connection refused")
    monkeypatch.setattr(llm_classifier.requests, "post", mock_post)
    with pytest.raises(llm_classifier.EmailLLMTransientError, match="request failed"):
        llm_classifier.classify_email_with_ollama("Test")


def test_classify_email_with_ollama_invalid_json(monkeypatch):
    class MockResponse:
        def raise_for_status(self):
            pass
        def json(self):
            raise ValueError("JSON decode error")
    monkeypatch.setattr(llm_classifier.requests, "post", lambda *args, **kwargs: MockResponse())
    with pytest.raises(llm_classifier.EmailLLMTransientError, match="invalid JSON"):
        llm_classifier.classify_email_with_ollama("Test")


def test_excludes_any_branch():
    res = class_rules.classify_email_by_rules(
        subject="application status",
        sender="hiring@company.com",
        body="if you are not selected for this position we will let you know. we have received your application.",
        email_text="if you are not selected for this position we will let you know. we have received your application."
    )
    assert res["matched"] is True
    assert res["stage"] == "applied"


def test_apply_stage_matches_branches():
    from classification.class_rules import Match, _apply_stage_matches
    stage_scores = {}
    category_scores = {"SOME_CAT": 0.0}
    matched_rules = []
    
    matches = [
        Match(target="applied", rule="test1", weight=1.0, kind="phrase", category=None),
        Match(target="SOME_CAT", rule="test2", weight=2.0, kind="phrase"),
        Match(target="UNKNOWN_CAT", rule="test3", weight=3.0, kind="phrase"),
    ]
    
    _apply_stage_matches(stage_scores, category_scores, matched_rules, matches)
    assert stage_scores["applied"] == 1.0
    assert category_scores["SOME_CAT"] == 2.0
    assert "UNKNOWN_CAT" not in category_scores
    assert len(matched_rules) == 3


def test_offer_content_marketing_with_true_offer_lifecycle():
    res = class_rules.classify_email_by_rules(
        subject="salary update",
        sender="hr@company.com",
        body="register below for the webinar about compensation. Here is your official employment offer letter.",
        email_text="webinar registration details. employment offer letter."
    )
    assert res["matched"] is True
    assert res["stage"] == "offer"


def test_offer_content_marketing_excluded():
    res = class_rules.classify_email_by_rules(
        subject="salary trends",
        sender="news@company.com",
        body="register below for our upcoming webinar on career planning, salary trends and compensation options.",
        email_text="register below for our upcoming webinar on career planning, salary trends and compensation options."
    )
    assert res["matched"] is True
    assert res["relevant"] is False
    assert res["category"] == "NOT_JOB_RELATED"
    assert res["reason"] == "rule_offer_content_marketing"


def test_batch_status_update_subject_no_terminal():
    res = class_rules.classify_email_by_rules(
        subject="application updates",
        sender="no-reply@workday.com",
        body="updates about your applications to the following companies: Google, Meta. Applied 10 days ago.",
        email_text="updates about your applications to the following companies: Google, Meta. Applied 10 days ago."
    )
    # The current rule logic returns matched=False for batch updates with terminal_count=0
    # but still sets requires_inference=True.
    assert res["matched"] is False
    assert res["requires_inference"] is True
    assert res["category"] == "APPLICATION_UPDATE"


def test_batch_status_update_expired_with_cap():
    res = class_rules.classify_email_by_rules(
        subject="Status update",
        sender="no-reply@workday.com",
        body="your applications to the following: Google: Expired, Applied 30 days ago. Meta: Expired, Applied 14 days ago.",
        email_text="your applications to the following: Google: Expired, Applied 30 days ago. Meta: Expired, Applied 14 days ago."
    )
    assert res["category"] == "REJECTION"
    assert res["stage"] == "rejected"
    assert res["reason"] == "rule_batch_application_expired"


def test_batch_status_update_rejected_no_expired():
    res = class_rules.classify_email_by_rules(
        subject="Status update",
        sender="no-reply@workday.com",
        body="your applications to the following: Google: Closed. Meta: Rejected. Both: Applied 5 days ago.",
        email_text="your applications to the following: Google: Closed. Meta: Rejected. Both: Applied 5 days ago."
    )
    assert res["category"] == "REJECTION"
    assert res["stage"] == "rejected"
    assert res["reason"] == "rule_batch_terminal_status"


def test_conditional_rejection_context():
    res = class_rules.classify_email_by_rules(
        subject="application status",
        sender="hiring@company.com",
        body="if not selected, we will keep your resume on file. We received your application.",
        email_text="if not selected, we will keep your resume on file. We received your application."
    )
    assert res["matched"] is True
    assert res["stage"] == "applied"


def test_best_category_for_stage_fallback():
    from classification.class_rules import _best_category_for_stage
    category_scores = {"APPLICATION_RECEIVED": 0.0, "APPLICATION_UPDATE": 0.0}
    assert _best_category_for_stage("applied", category_scores) == "APPLICATION_RECEIVED"


def test_best_category_for_stage_no_possible(monkeypatch):
    monkeypatch.setitem(class_rules.STAGE_TO_DEFAULT_CATEGORY, "nonexistent", "DEFAULT_VAL")
    assert class_rules._best_category_for_stage("nonexistent", {}) == "DEFAULT_VAL"


def test_top_lifecycle_category_score_empty():
    assert class_rules._top_lifecycle_category_score({"OTHER": 1.0}) == (None, 0.0)


def test_hard_match_stages():
    from classification.class_rules import Match, _hard_match_stages
    matches = [
        Match(target="applied", rule="r1", weight=1.0, kind="p", hard=True),
        Match(target="applied", rule="r2", weight=1.0, kind="p", hard=False),
        Match(target="OTHER", rule="r3", weight=1.0, kind="p", hard=True),
    ]
    assert _hard_match_stages(matches) == {"applied"}


def test_fallback_category_match():
    res = class_rules.classify_email_by_rules(
        subject="application status update",
        sender="no-reply@company.com",
        body="Important information regarding your application status update. Please login to view application status.",
        email_text="application status update"
    )
    assert res["matched"] is True
    assert res["category"] == "APPLICATION_UPDATE"
    assert res["stage"] == "applied"
    assert res["reason"] == "rule_category_match"


def test_no_lifecycle_context_non_job_related():
    res = class_rules.classify_email_by_rules(
        subject="opportunity",
        sender="alert@indeed.com",
        body="Here is an opportunity. Review this recommended job and apply today.",
        email_text="Indeed recommended job."
    )
    assert res["matched"] is True
    assert res["relevant"] is False
    assert res["category"] == "NOT_JOB_RELATED"


def test_no_lifecycle_context_and_low_signal():
    res = class_rules.classify_email_by_rules(
        subject="hello",
        sender="friend@domain.com",
        body="just checking in",
        email_text="just checking in"
    )
    assert res["matched"] is True
    assert res["relevant"] is False
    assert res["category"] == "NOT_JOB_RELATED"
    assert res["reason"] == "rule_generic_job_without_lifecycle"


def test_run_classification_model_empty():
    res = class_tasks.run_classification_model("trace-empty", [])
    assert isinstance(res, class_tasks.ClassificationModelResult)
    assert not res.applied


def test_run_classification_model_rule_error(monkeypatch):
    def mock_classify(*args, **kwargs):
        raise RuntimeError("rules engine failed")
    monkeypatch.setattr(class_tasks, "classify_email_by_rules", mock_classify)
    
    email = {"id": "email-1", "subject": "S", "sender": "S", "body": "B", "provider_message_id": "P"}
    res = class_tasks.run_classification_model("trace-err", [email])
    assert len(res.retry) == 1
    assert res.retry[0]["email_id"] == "email-1"
    assert res.retry[0]["reason"] == "rule_error"


def test_run_classification_model_inference():
    email = {
        "id": "email-2",
        "subject": "Important update regarding your application",
        "sender": "noreply@company.com",
        "body": "Please login to review this important update.",
        "provider_message_id": "P-2"
    }
    res = class_tasks.run_classification_model("trace-inf", [email])
    assert len(res.inference) == 1
    assert res.inference[0]["email_id"] == "email-2"


def test_run_classification_model_low_confidence_review(monkeypatch):
    mock_res = {
        "matched": True,
        "relevant": True,
        "category": "APPLICATION_RECEIVED",
        "stage": "applied",
        "score": 0.5,
        "second_stage": "interview",
        "second_score": 0.45,
        "reason": "mocked",
    }
    monkeypatch.setattr(class_tasks, "classify_email_by_rules", lambda **kw: mock_res)
    email = {"id": "email-3", "subject": "S", "sender": "S", "body": "B", "provider_message_id": "P"}
    res = class_tasks.run_classification_model("trace-rev", [email])
    assert len(res.applied) == 1
    assert res.applied[0]["needs_review"] is True


def test_run_classification_model_exception_during_grouping(monkeypatch):
    # Mock result that would cause a key error if 'stage' was missing, but it's present.
    # To trigger the 'retry' path, we need an exception in the processing loop.
    def mock_classify(**kw):
        return {"matched": True, "relevant": True, "stage": "bad_stage", "score": 1.0, "provider_message_id": "P"}
    
    monkeypatch.setattr(class_tasks, "classify_email_by_rules", mock_classify)
    
    # We want to trigger the Exception block at the end of the loop in run_classification_model
    # The current code catches exceptions around classify_email_by_rules, and also around the result processing.
    # If final_label is not in the if/elif chain, it just doesn't get added to any list.
    # We need to trigger the EXCEPT block for the entire email processing.
    
    def mock_error_processing(*args, **kwargs):
        raise RuntimeError("processing error")
        
    monkeypatch.setattr(class_tasks, "classify_email_by_rules", mock_error_processing)
    
    email = {"id": "email-4", "subject": "S", "sender": "S", "body": "B", "provider_message_id": "P"}
    res = class_tasks.run_classification_model("trace-grp-err", [email])
    assert len(res.retry) == 1
    assert res.retry[0]["email_id"] == "email-4"


def test_schedule_inference_retry_exhausted():
    res = class_tasks.schedule_inference_retry("trace-exh", ["email-1"], attempt=3, error="Ollama timeout")
    assert res == {"status": "failure", "error": "Ollama timeout", "retry": 0}


def test_requeue_stale_email_inference_task_no_stale(monkeypatch):
    monkeypatch.setattr(class_tasks, "get_stale_processing_staging_row_ids", lambda *a, **kw: [])
    res = class_tasks.requeue_stale_email_inference_task("trace-stale")
    assert res == {"status": "success", "queued": 0}


def test_email_inference_task_empty_list():
    res = class_tasks.email_inference_task("trace", [])
    assert res["message"] == "No inference rows to process"


def test_email_inference_task_empty_db(monkeypatch):
    monkeypatch.setattr(class_tasks, "get_encrypted_emails", lambda *a: [])
    res = class_tasks.email_inference_task("trace", ["email-1"])
    assert res["message"] == "No inference rows to process"


def test_email_inference_task_decryption_exception(monkeypatch):
    monkeypatch.setattr(class_tasks, "get_encrypted_emails", lambda *a: [{"id": "email-1", "provider_message_id": "P"}])
    def mock_decrypt(*args):
        raise RuntimeError("Decryption failed")
    monkeypatch.setattr(class_tasks, "decrypt_email_content", mock_decrypt)
    monkeypatch.setattr(class_tasks.email_inference_task, "apply_async", lambda **kw: None)
    
    res = class_tasks.email_inference_task("trace", ["email-1"], attempt=1)
    assert res["status"] == "retry_scheduled"
    
    marked = []
    monkeypatch.setattr(class_tasks, "mark_staging_job_applications_for_review", lambda t, ids: marked.extend(ids))
    res = class_tasks.email_inference_task("trace", ["email-1"], attempt=3)
    assert res["status"] == "failure"
    assert "P" in marked


def test_email_inference_task_normalization_exception(monkeypatch):
    monkeypatch.setattr(class_tasks, "get_encrypted_emails", lambda *a: [{"id": "email-1", "provider_message_id": "P"}])
    monkeypatch.setattr(class_tasks, "decrypt_email_content", lambda *a: [{"id": "email-1", "provider_message_id": "P"}])
    def mock_norm(*args):
        raise RuntimeError("Normalization failed")
    monkeypatch.setattr(class_tasks, "normalized_emails_for_model", mock_norm)
    monkeypatch.setattr(class_tasks.email_inference_task, "apply_async", lambda **kw: None)
    
    res = class_tasks.email_inference_task("trace", ["email-1"], attempt=1)
    assert res["status"] == "retry_scheduled"
    
    marked = []
    monkeypatch.setattr(class_tasks, "mark_staging_job_applications_for_review", lambda t, ids: marked.extend(ids))
    res = class_tasks.email_inference_task("trace", ["email-1"], attempt=3)
    assert res["status"] == "failure"
    assert "P" in marked


def test_email_inference_task_empty_normalized(monkeypatch):
    monkeypatch.setattr(class_tasks, "get_encrypted_emails", lambda *a: [{"id": "email-1", "provider_message_id": "P"}])
    monkeypatch.setattr(class_tasks, "decrypt_email_content", lambda *a: [{"id": "email-1", "provider_message_id": "P"}])
    monkeypatch.setattr(class_tasks, "normalized_emails_for_model", lambda *a: [])
    res = class_tasks.email_inference_task("trace", ["email-1"])
    assert res["message"] == "No inference rows to process"


def test_email_inference_task_llm_outcomes(monkeypatch):
    monkeypatch.setattr(class_tasks, "get_encrypted_emails", lambda t, ids: [{"id": idx, "provider_message_id": f"P-{idx}"} for idx in ids])
    monkeypatch.setattr(class_tasks, "decrypt_email_content", lambda t, rows: [{"id": r["id"], "subject": "S", "sender": "S", "body": "B", "provider_message_id": r["provider_message_id"]} for r in rows])
    monkeypatch.setattr(class_tasks, "normalized_emails_for_model", lambda t, rows: rows)
    monkeypatch.setattr(class_tasks, "update_job_app_table", lambda t, res: {"status": "success", "rows_affected": len(res.applied) + len(res.interview)})
    monkeypatch.setattr(class_tasks, "cleanup_non_job_results", lambda t, rows: {"status": "success"})
    
    marked = []
    monkeypatch.setattr(class_tasks, "mark_staging_job_applications_for_review", lambda t, ids: marked.extend(ids))
    
    retried = []
    monkeypatch.setattr(class_tasks.email_inference_task, "apply_async", lambda **kw: retried.append(kw))
    
    llm_responses = {
        "Subject: S \nFrom: S \nBody: B": [
            {"category": "INTERVIEW", "confidence": 0.9, "reason": "test"},
            {"category": "NOT_JOB_RELATED", "confidence": 0.9, "reason": "test"},
            {"category": "UNKNOWN", "confidence": 0.9, "reason": "test"},
            llm_classifier.EmailLLMClassifierError("classifier error"),
            llm_classifier.EmailLLMTransientError("transient error"),
            llm_classifier.EmailLLMTransientError("transient error"),
        ]
    }
    
    call_count = 0
    def mock_classify(text):
        nonlocal call_count
        res = llm_responses["Subject: S \nFrom: S \nBody: B"][call_count]
        call_count += 1
        if isinstance(res, Exception):
            raise res
        return res
    
    monkeypatch.setattr(class_tasks, "classify_email_with_ollama", mock_classify)
    
    res = class_tasks.email_inference_task("trace", ["1", "2", "3", "4", "5"], attempt=3)
    assert res["status"] == "success"
    assert res["results"] == 1
    assert res["review"] == 3
    assert "P-3" in marked
    assert "P-4" in marked
    assert "P-5" in marked
    
    res2 = class_tasks.email_inference_task("trace", ["6"], attempt=1)
    assert res2["status"] == "success"
    assert res2["retry"] == 1
    assert len(retried) == 1
    assert retried[0]["args"] == ["trace", ["6"], 2]


def test_email_inference_task_db_failure(monkeypatch):
    monkeypatch.setattr(class_tasks, "get_encrypted_emails", lambda t, ids: [{"id": "email-1", "provider_message_id": "P-1"}])
    monkeypatch.setattr(class_tasks, "decrypt_email_content", lambda t, rows: [{"id": "email-1", "subject": "S", "sender": "S", "body": "B", "provider_message_id": "P-1"}])
    monkeypatch.setattr(class_tasks, "normalized_emails_for_model", lambda t, rows: rows)
    monkeypatch.setattr(class_tasks, "classify_email_with_ollama", lambda t: {"category": "INTERVIEW", "confidence": 0.9})
    monkeypatch.setattr(class_tasks, "update_job_app_table", lambda t, res: {"status": "failure", "error": "db timeout"})
    monkeypatch.setattr(class_tasks.email_inference_task, "apply_async", lambda **kw: None)
    
    res = class_tasks.email_inference_task("trace", ["email-1"])
    assert res["status"] == "retry_scheduled"


def test_build_llm_result_item_not_job_low_confidence():
    email = {"id": "1", "provider_message_id": "P"}
    res1 = class_tasks.build_llm_result_item(email, {"category": "NOT_JOB_RELATED", "confidence": 0.70, "secondary_confidence": 0.65})
    assert res1 is None
    
    res2 = class_tasks.build_llm_result_item(email, {"category": "NOT_JOB_RELATED", "confidence": 0.80, "secondary_confidence": 0.75})
    assert res2 is None
    
    res3 = class_tasks.build_llm_result_item(email, {"category": "NOT_JOB_RELATED", "confidence": 0.85, "secondary_confidence": 0.10, "reason": "test"})
    assert res3 is not None
    assert res3["category"] == "NOT_JOB_RELATED"


def test_build_llm_result_item_unmapped_category():
    email = {"id": "1", "provider_message_id": "P"}
    res = class_tasks.build_llm_result_item(email, {"category": "RECRUITER_OUTREACH", "confidence": 0.90})
    assert res is None

