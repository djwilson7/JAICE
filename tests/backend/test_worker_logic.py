from __future__ import annotations

import base64
import json
import sys
import types

import pytest

from classification import class_queries, class_tasks
from classification import class_rules
from gmail import gmail_tasks
from common.email_text import clean_email_body, html_to_clean_text, strip_email_boilerplate
from common.job_application_crypto import decrypt_job_application_value
from common.security import encrypt_token
from shared_worker_library.db_queries import job_application_queries
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
        lambda **kwargs: captured.update(kwargs)
        or {"status": "success", "rows_affected": 1},
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


def test_email_body_cleanup_removes_template_noise_and_preserves_content():
    html = """
        <html>
          <body>
            <div class="email-preheader">Preview text that should not show</div>
            <header><img alt="Company Logo">Careers Header</header>
            <main>
              <p>Interview Invitation</p>
              <p>Please schedule your interview for the Software Engineer role.</p>
              <a href="https://tracking.example.com/click?id=123">Schedule interview</a>
            </main>
            <img class="logo" alt="Brand Logo">
            <div class="social-links"><a>LinkedIn</a><a>Twitter</a></div>
            <footer>
              <p>Unsubscribe</p>
              <p>Privacy Policy</p>
            </footer>
          </body>
        </html>
    """

    result = html_to_clean_text(html, return_debug=True)

    assert result.text == (
        "Interview Invitation\n"
        "\n"
        "Please schedule your interview for the Software Engineer role.\n"
        "\n"
        "Schedule interview"
    )
    assert "Logo" not in result.text
    assert "LinkedIn" not in result.text
    assert "Unsubscribe" not in result.text
    assert result.html_nodes_removed > 0


def test_email_body_cleanup_handles_plain_text_and_boilerplate_conservatively():
    text = """
        Application Received

        Your application status has been updated.
        View this email in your browser
        Manage preferences
        Offer Letter
        © 2026 Example Inc. All rights reserved.
    """

    cleaned = clean_email_body(text, "text/plain")

    assert cleaned == (
        "Application Received\n"
        "\n"
        "Your application status has been updated.\n"
        "Offer Letter"
    )


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("Apply here (https://tracking.example.com/apply)", "Apply here"),
        ("Schedule interview [https://tracking.example.com/schedule]", "Schedule interview"),
        ("Status: [](https://tracking.example.com/status)", "Status:"),
        ("Offer Letter ()", "Offer Letter"),
    ],
)
def test_email_body_cleanup_removes_empty_link_artifacts(text, expected):
    assert clean_email_body(text, "text/plain") == expected


def test_email_body_cleanup_removes_separator_and_logo_artifact_lines():
    cleaned = clean_email_body(
        """
        Indeed Logo
        -
        -
        -
        Application Received
        Your application status has changed.
        Company Icon
        Offer Letter
        """,
        "text/plain",
    )

    assert cleaned == (
        "Application Received\n"
        "Your application status has changed.\n"
        "Offer Letter"
    )


def test_strip_email_boilerplate_keeps_short_job_lines():
    cleaned, removed = strip_email_boilerplate(
        "Action Required\nUnsubscribe\nComplete your assessment\nDownload the app"
    )

    assert cleaned == "Action Required\nComplete your assessment"
    assert removed == 2


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
            "Thank you for your application to Example Corp",
            "Our recruiting team will review your materials and contact you with any updates.",
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
        "New opportunity near you",
        "Explore new possibilities",
        "Explore new possiblities",
        "Your latest job matches",
        "Recommended positions for you",
        "Jobs you may like",
        "Opportunities you may like",
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
    assert result["reason"] == "rule_marketing_alert_subject"


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
            "reason": "rule_marketing_alert_subject",
        }
    ]


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
            f"{marketing_text} We received your application."
        ),
        email_text=(
            "Body: This role could be a match for your experience. "
            f"{marketing_text} We received your application."
        ),
    )

    assert result["matched"] is True
    assert result["relevant"] is False
    assert result["category"] == "NOT_JOB_RELATED"
    assert result["stage"] is None
    assert result["requires_inference"] is False
    assert result["reason"] == "rule_marketing_body_exclusion"


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
            "reason": "rule_marketing_body_exclusion",
        }
    ]


@pytest.mark.parametrize(
    "feedback_text",
    [
        "This is a bad match",
        "This isn't a good match",
        "This is not a good match",
        "Not a good match for me",
    ],
)
def test_rule_classifier_filters_indeed_marketing_feedback_controls(feedback_text):
    result = class_rules.classify_email_by_rules(
        subject="Senior Software Engineer at Example Corp",
        sender="Indeed <alert@indeed.com>",
        body=f"View job. {feedback_text}.",
        email_text=f"From: alert@indeed.com Body: View job. {feedback_text}.",
    )

    assert result["matched"] is True
    assert result["relevant"] is False
    assert result["category"] == "NOT_JOB_RELATED"
    assert result["stage"] is None
    assert result["reason"] == "rule_indeed_marketing_feedback"


@pytest.mark.parametrize(
    "campaign_text",
    [
        "Do you want to get more jobs like this?",
        "Keep your profile up to date to improve your matches.",
        "You received this job match email based on your activity.",
    ],
)
def test_rule_classifier_filters_indeed_match_marketing_campaigns(campaign_text):
    result = class_rules.classify_email_by_rules(
        subject="FirstNow could be a match",
        sender="Indeed <alert@indeed.com>",
        body=(
            "This employer's job could be a match based on your profile. "
            f"{campaign_text}"
        ),
        email_text=(
            "From: alert@indeed.com "
            "Body: This employer's job could be a match based on your profile. "
            f"{campaign_text}"
        ),
    )

    assert result["matched"] is True
    assert result["relevant"] is False
    assert result["category"] == "NOT_JOB_RELATED"
    assert result["stage"] is None
    assert result["requires_inference"] is False
    assert result["reason"] == "rule_marketing_body_exclusion"


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
    assert result["reason"] == "rule_stage_match"


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
            "Body: Unfortunately, we have decided to move forward with "
            "other candidates."
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
    assert result["reason"] == "application_update_requires_inference"


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
            "rule_marketing_alert_subject",
        ),
        (
            "Senior Software Engineer opportunity",
            "Indeed <alert@indeed.com>",
            "This company is hiring now. View open roles and apply today.",
            "rule_marketing_body_exclusion",
        ),
        (
            "Role that may interest you",
            "Recruiter <recruiter@example.com>",
            "I found a role that may interest you and would like to connect.",
            "rule_no_application_lifecycle_context",
        ),
    ],
)
def test_rule_classifier_blocks_job_marketing_and_generic_outreach(
    subject,
    sender,
    body,
    reason,
):
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
        (
            "An update from Softrip, Shoken and 6 others",
            "Wellfound <team@hi.wellfound.com>",
            (
                "An update about your application. Your applications to the following "
                "companies have expired. We expire applications when a company does "
                "not process the application in time."
            ),
        ),
    ],
)
def test_run_classification_model_keeps_clear_rejections_out_of_review(
    subject,
    sender,
    body,
):
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
                "reason": "rule_no_application_lifecycle_context",
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
            "reason": "rule_content_marketing",
        },
        {
            "email_id": "id-4",
            "provider_message_id": "msg-4",
            "reason": "rule_no_application_lifecycle_context",
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
    assert (
        gmail_tasks.strip_html(
            "<style>.hidden{}</style><p>Infrastructure Engineer</p><p>Kalderos</p>"
        )
        == "Infrastructure Engineer\nKalderos"
    )
    assert (
        gmail_tasks.strip_html(
            "<p>Application status</p><form><input aria-label='Hidden input'>"
            "<button>Template button</button></form>"
        )
        == "Application status"
    )
    assert (
        gmail_tasks.strip_html(
            "<html><head><title>Ignored</title></head><body>"
            "<div class='email-preheader'><p>Preview text</p></div>"
            "<p>Application received</p>"
            "<div aria-hidden='true'><p>Tracking copy</p></div>"
            "<div class='social-links'><a aria-label='Twitter'></a></div>"
            "</body></html>"
        )
        == "Application received"
    )
    assert gmail_tasks.extract_plain_text_from_payload({"mimeType": "text/plain", "body": {"data": encoded}}) == "plain body"
    assert gmail_tasks.extract_plain_text_from_payload({"mimeType": "text/html", "body": {"data": base64.urlsafe_b64encode(b"<p>Top level HTML</p>").decode("ascii")}}) == "Top level HTML"
    assert gmail_tasks.extract_plain_text_from_payload({"parts": [{"mimeType": "text/html", "body": {"data": base64.urlsafe_b64encode(b"<b>HTML</b>").decode("ascii")}}]}) == "HTML"
    assert gmail_tasks.extract_plain_text_from_payload({"parts": [{"parts": [{"mimeType": "text/plain", "body": {"data": encoded}}]}]}) == "plain body"
    slim_plain = base64.urlsafe_b64encode(b"View this email in your browser.").decode("ascii")
    rich_html = base64.urlsafe_b64encode(
        (
            b"<html><body><p>Infrastructure Engineer at Kalderos</p>"
            b"<p>Your application was received by the hiring team. "
            b"They will follow up after reviewing your background.</p>"
            + (b"<p>Additional role context.</p>" * 20)
            + b"</body></html>"
        )
    ).decode("ascii")
    assert "Infrastructure Engineer at Kalderos" in gmail_tasks.extract_plain_text_from_payload(
        {
            "parts": [
                {"mimeType": "text/plain", "body": {"data": slim_plain}},
                {"mimeType": "text/html", "body": {"data": rich_html}},
            ]
        }
    )
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
                    "snippet": "fallback snippet",
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

    parsed_with_snippet = gmail_tasks.parse_successful_fetches(
        "trace",
        [
            {
                "msg_id": "snippet-only",
                "response": {
                    "id": "snippet-only",
                    "threadId": "t2",
                    "historyId": "h2",
                    "internalDate": "456",
                    "snippet": "Infrastructure Engineer at Kalderos &amp; application update",
                    "payload": {"headers": [], "parts": []},
                },
            }
        ],
        "user-123",
    )
    assert (
        parsed_with_snippet[0]["body_text"]
        == "Infrastructure Engineer at Kalderos & application update"
    )

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
