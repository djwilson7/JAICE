"""Tests for the common domain.

Covers: common.security, common.logger, common.email_text,
        common.job_application_crypto
"""
from __future__ import annotations

import importlib

import pytest

from common import logger as logger_module
from common import security
from common.email_text import (
    clean_email_body,
    html_to_clean_text,
    strip_email_boilerplate,
    clean_email_html,
    html_to_plain_text,
    html_or_text_to_plain_text,
    EmailBodyCleanupResult,
)
from common.job_application_crypto import (
    _job_application_fernet,
    encrypt_job_application_value,
    decrypt_job_application_value,
    serialize_job_application,
    serialize_job_applications,
)


# ---------------------------------------------------------------------------
# common.security
# ---------------------------------------------------------------------------

def test_security_roundtrip_and_invalid_inputs():
    encrypted = security.encrypt_token("refresh-token")
    assert security.decrypt_token(encrypted) == "refresh-token"
    assert security.decrypt_token(encrypted.decode("utf-8")) == "refresh-token"

    with pytest.raises(ValueError, match="cannot be None"):
        security.decrypt_token(None)


def test_security_rejects_operations_when_fernet_is_unavailable(monkeypatch):
    monkeypatch.setattr(security, "f", None)

    with pytest.raises(ValueError, match="Encryption is unavailable"):
        security.encrypt_token("refresh-token")
    with pytest.raises(ValueError, match="Decryption is unavailable"):
        security.decrypt_token(b"refresh-token")


def test_security_import_configuration_failures(monkeypatch):
    key = "MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA="
    monkeypatch.delenv("FERNET_KEY", raising=False)
    with pytest.raises(ValueError, match="FERNET_KEY"):
        importlib.reload(security)

    monkeypatch.setenv("FERNET_KEY", "invalid")
    reloaded = importlib.reload(security)
    assert reloaded.f is None

    monkeypatch.setenv("FERNET_KEY", key)
    importlib.reload(security)


# ---------------------------------------------------------------------------
# common.logger
# ---------------------------------------------------------------------------

def test_logger_reuses_existing_handler():
    log = logger_module.get_logger("unit-test-logger")
    initial_handlers = list(log.handlers)

    same_log = logger_module.get_logger("unit-test-logger")

    assert same_log is log
    assert same_log.handlers == initial_handlers
    assert same_log.propagate is False


# ---------------------------------------------------------------------------
# common.email_text
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# common.job_application_crypto
# ---------------------------------------------------------------------------

def test_processing_placeholder_encrypts_public_job_content():
    """Verify that encrypt_token/decrypt roundtrip preserves values using security module."""
    token = "some sensitive value"
    encrypted = security.encrypt_token(token)
    assert security.decrypt_token(encrypted) == token


# ===========================================================================
# Coverage Expansion: common.job_application_crypto
# ===========================================================================

def test_job_application_crypto_key_validation(monkeypatch):
    # Ensure cache is cleared
    _job_application_fernet.cache_clear()

    try:
        # 1. Missing FERNET_KEY raises ValueError
        monkeypatch.delenv("FERNET_KEY", raising=False)
        with pytest.raises(ValueError, match="FERNET_KEY environment variable is not set"):
            _job_application_fernet()

        # 2. Invalid base64 key raises ValueError
        monkeypatch.setenv("FERNET_KEY", "!!!invalid-base64-format!!!")
        with pytest.raises(ValueError, match="FERNET_KEY is not valid URL-safe base64"):
            _job_application_fernet()
    finally:
        _job_application_fernet.cache_clear()


def test_job_application_crypto_roundtrip_and_formats(monkeypatch):
    # Setup valid key
    valid_key = "MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA="
    monkeypatch.setenv("FERNET_KEY", valid_key)
    _job_application_fernet.cache_clear()

    try:
        # 1. None values
        assert encrypt_job_application_value(None) is None
        assert decrypt_job_application_value(None) is None

        # 2. Basic roundtrip
        original = "Software Engineer"
        encrypted = encrypt_job_application_value(original)
        assert isinstance(encrypted, bytes)
        assert decrypt_job_application_value(encrypted) == original

        # 3. Decrypt memoryview
        assert decrypt_job_application_value(memoryview(encrypted)) == original

        # 4. Decrypt postgres hex string format (\x...)
        hex_format = "\\x" + encrypted.hex()
        assert decrypt_job_application_value(hex_format) == original
    finally:
        _job_application_fernet.cache_clear()


def test_job_application_crypto_serialization(monkeypatch):
    valid_key = "MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA="
    monkeypatch.setenv("FERNET_KEY", valid_key)
    _job_application_fernet.cache_clear()

    try:
        title_enc = encrypt_job_application_value("Software Engineer")
        company_enc = encrypt_job_application_value("Acme")

        row = {
            "id": 123,
            "title_enc": title_enc,
            "company_name_enc": company_enc,
            "description_enc": None,
            "status": "applied",
            # note_enc is missing
        }

        # Test single row serialization
        serialized = serialize_job_application(row)
        assert serialized["id"] == 123
        assert serialized["title"] == "Software Engineer"
        assert serialized["company_name"] == "Acme"
        assert serialized["description"] is None
        assert serialized["status"] == "applied"
        assert "title_enc" not in serialized
        assert "company_name_enc" not in serialized
        assert "description_enc" not in serialized
        assert "note" not in serialized

        # Test list serialization
        rows = [row, {"id": 456, "status": "interviewing"}]
        serialized_list = serialize_job_applications(rows)
        assert len(serialized_list) == 2
        assert serialized_list[0]["title"] == "Software Engineer"
        assert serialized_list[1]["id"] == 456
        assert "title" not in serialized_list[1]
    finally:
        _job_application_fernet.cache_clear()


# ===========================================================================
# Coverage Expansion: common.email_text
# ===========================================================================

def test_email_body_html_detection_and_debug_flow():
    html = "<div>Hello HTML</div>"
    # Triggers line 78 in clean_email_body (auto-detect HTML)
    assert clean_email_body(html) == "Hello HTML"
    
    # Triggers explicit HTML clean
    assert clean_email_body("Hello HTML", content_type="text/html") == "Hello HTML"
    
    # Triggers return_debug branch in clean_email_body
    res = clean_email_body(html, return_debug=True)
    assert isinstance(res, EmailBodyCleanupResult)
    assert res.content_type_used == "text/html"


def test_clean_email_html_direct():
    html = "<p>Test HTML</p>"
    # Triggers lines 99-100 (clean_email_html)
    assert clean_email_html(html) == "Test HTML"
    
    res = clean_email_html(html, return_debug=True)
    assert isinstance(res, EmailBodyCleanupResult)
    assert res.text == "Test HTML"


def test_html_extractor_elements_outside_body():
    # Triggers line 242 (tag outside/after closed body)
    html = "<body>Inside body</body><p>Outside tag</p>"
    assert html_to_clean_text(html) == "Inside body"


def test_html_extractor_list_and_table_tags():
    # Triggers lines 247, 249, 263 (list items and td/th spacing)
    html = """
    <ul>
      <li>Bullet item</li>
    </ul>
    <table>
      <tr>
        <th>Header 1</th><td>Value 1</td>
      </tr>
    </table>
    """
    res = html_to_clean_text(html)
    assert "- Bullet item" in res
    assert "Header 1 Value 1" in res


def test_html_extractor_skipped_body_endtag():
    # Triggers line 257 (body close inside a skipped block)
    html = "<body>Main text<div class='unsubscribe'>Unsubscribe links</body></div>"
    res = html_to_clean_text(html)
    assert "Main text" in res
    assert "Unsubscribe" not in res


def test_html_extractor_pruning_by_attributes():
    # Triggers line 275 (hidden / aria-hidden pruning)
    html = """
    <div>Visible</div>
    <div hidden>Hidden 1</div>
    <div aria-hidden="true">Hidden 2</div>
    """
    res = html_to_clean_text(html)
    assert "Visible" in res
    assert "Hidden" not in res


def test_html_extractor_pruning_by_styles():
    # Triggers lines 279, 281, 283 (style: display:none, visibility:hidden, opacity:0, width:0, height:0)
    html = """
    <div>Visible</div>
    <div style="display:none">Pruned 1</div>
    <div style="visibility: hidden">Pruned 2</div>
    <div style="opacity: 0">Pruned 3</div>
    <div style="width: 0px">Pruned 4</div>
    <div style="height: 0px">Pruned 5</div>
    <div style="width: 0">Pruned 6</div>
    <div style="height: 0">Pruned 7</div>
    """
    res = html_to_clean_text(html)
    assert "Visible" in res
    assert "Pruned" not in res


def test_html_to_plain_text_wrappers():
    # Triggers lines 308 and 312
    html = "<div>Hello</div>"
    assert html_to_plain_text(html) == "Hello"
    assert html_or_text_to_plain_text(html) == "Hello"
    assert html_or_text_to_plain_text("Plain Hello") == "Plain Hello"


