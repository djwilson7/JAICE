from __future__ import annotations

import builtins
import os
import sys
import time
import types
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import pytest
from fastapi import HTTPException

from client_api.api import resume


USER = {"uid": "user-1"}
RESUME_ID = "11111111-1111-1111-1111-111111111111"
SOURCE_ID = uuid.UUID("22222222-2222-2222-2222-222222222222")


def resume_data(**overrides):
    data = {"fullName": "Avery Applicant"}
    data.update(overrides)
    return resume.ResumeData(**data)


def db_row(**overrides):
    now = datetime(2026, 6, 2, tzinfo=timezone.utc)
    data = {
        "id": uuid.UUID(RESUME_ID),
        "name": "Resume",
        "is_master": False,
        "schema_version": 1,
        "source_resume_id": None,
        "resume_data": resume_data().model_dump_json(),
        "target_job_title": None,
        "target_job_description": None,
        "created_at": now,
        "updated_at": now,
    }
    data.update(overrides)
    return data


class Transaction:
    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return None


class Conn:
    def __init__(self, *, rows=(), row=None, exists=True):
        self.rows = rows
        self.row = row
        self.exists = exists
        self.execute_calls = []

    def transaction(self):
        return Transaction()

    async def fetch(self, *_args):
        return self.rows

    async def fetchrow(self, *_args):
        return self.row

    async def fetchval(self, *_args):
        return 1 if self.exists else None

    async def execute(self, query, *args):
        self.execute_calls.append((query, args))
        return "OK"


@asynccontextmanager
async def connection(conn):
    yield conn


def save_payload():
    return resume.SaveResumeRequest(name="Resume", resume_data=resume_data())


def update_payload():
    return resume.UpdateResumeRequest(name="Resume", resume_data=resume_data())


def test_render_resume_pdf_html_skips_empty_experience_and_education():
    document, *_ = resume._render_resume_pdf_html(
        resume_data(
            experience=[
                {
                    "jobTitle": "",
                    "company": "",
                    "location": "",
                    "startDate": "",
                    "endDate": "",
                    "bullets": [],
                }
            ],
            education=[
                {
                    "school": "",
                    "degree": "",
                    "startDate": "",
                    "endDate": "",
                    "details": [],
                }
            ],
        )
    )
    assert "Work Experience" not in document
    assert "Education" not in document


@pytest.mark.asyncio
async def test_list_resumes_preserves_non_string_resume_data(monkeypatch):
    conn = Conn(rows=[db_row(resume_data={"fullName": "Already decoded"})])
    monkeypatch.setattr(resume, "get_connection", lambda: connection(conn))

    result = await resume.list_resumes(USER)

    assert result["resumes"][0]["resume_data"] == {"fullName": "Already decoded"}


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("returned_resume_data", "expected_resume_data"),
    [
        ("{bad json", "{bad json"),
        ({"fullName": "Already decoded"}, {"fullName": "Already decoded"}),
    ],
)
async def test_save_resume_serialization_edges(
    monkeypatch, returned_resume_data, expected_resume_data
):
    conn = Conn(
        row=db_row(source_resume_id=SOURCE_ID, resume_data=returned_resume_data)
    )
    monkeypatch.setattr(resume, "get_connection", lambda: connection(conn))

    result = await resume.save_resume(save_payload(), USER)

    assert result["resume"]["source_resume_id"] == str(SOURCE_ID)
    assert result["resume"]["resume_data"] == expected_resume_data


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("returned_resume_data", "expected_resume_data"),
    [
        ("{bad json", "{bad json"),
        ({"fullName": "Already decoded"}, {"fullName": "Already decoded"}),
    ],
)
async def test_update_resume_serialization_edges(
    monkeypatch, returned_resume_data, expected_resume_data
):
    conn = Conn(
        row=db_row(source_resume_id=SOURCE_ID, resume_data=returned_resume_data)
    )
    monkeypatch.setattr(resume, "get_connection", lambda: connection(conn))

    result = await resume.update_resume(RESUME_ID, update_payload(), USER)

    assert result["resume"]["source_resume_id"] == str(SOURCE_ID)
    assert result["resume"]["resume_data"] == expected_resume_data


@pytest.mark.asyncio
async def test_update_resume_wraps_non_http_database_error(monkeypatch):
    @asynccontextmanager
    async def failing_connection():
        raise RuntimeError("database unavailable")
        yield

    monkeypatch.setattr(resume, "get_connection", failing_connection)

    with pytest.raises(HTTPException) as exc:
        await resume.update_resume(RESUME_ID, update_payload(), USER)

    assert exc.value.status_code == 500
    assert "database unavailable" in exc.value.detail


def install_failing_openai_module(monkeypatch):
    module = types.ModuleType("OpenAI.OpenAI_model")

    def fail(*_args, **_kwargs):
        raise RuntimeError("model failed")

    module.evaluate_resume_pdf = fail
    module.improve_resume_bullet = fail
    module.improve_resume_summary = fail
    module.evaluate_resume_structured = fail
    module.tailor_resume_ai = fail
    module.analyze_job_overlap_ai = fail
    monkeypatch.setitem(sys.modules, "OpenAI.OpenAI_model", module)


class Upload:
    filename = "resume.pdf"
    content_type = "application/pdf"

    async def read(self):
        return b"%PDF"


@pytest.mark.asyncio
async def test_openai_wrapper_errors(monkeypatch):
    install_failing_openai_module(monkeypatch)

    calls = [
        resume.upload_resume(Upload(), USER),
        resume.improve_bullet(resume.ImproveBulletRequest(bullet_text="Built APIs"), USER),
        resume.improve_summary(
            resume.ImproveSummaryRequest(summary_text="Engineer"), USER
        ),
        resume.evaluate_resume_structured_endpoint(resume_data(), USER),
        resume.tailor_resume_endpoint(
            resume.TailorResumeRequest(
                resume_data=resume_data(), job_description="Python"
            ),
            USER,
        ),
        resume.analyze_listing_endpoint(
            resume.TailorResumeRequest(
                resume_data=resume_data(), job_description="Python"
            ),
            USER,
        ),
    ]

    for call in calls:
        with pytest.raises(HTTPException) as exc:
            await call
        assert exc.value.status_code == 500


class Page:
    async def set_content(self, *_args, **_kwargs):
        return None

    async def emulate_media(self, *_args, **_kwargs):
        return None

    async def evaluate(self, *_args, **_kwargs):
        return None

    async def pdf(self, **_kwargs):
        return b"%PDF-FAKE"


class Browser:
    def __init__(self):
        self.closed = False

    async def new_page(self, **_kwargs):
        return Page()

    async def close(self):
        self.closed = True


class Chromium:
    async def launch(self, **_kwargs):
        return Browser()


class Playwright:
    def __init__(self):
        self.chromium = Chromium()


class PlaywrightContext:
    async def __aenter__(self):
        return Playwright()

    async def __aexit__(self, *_args):
        return None


def install_playwright(monkeypatch, async_playwright):
    module = types.ModuleType("playwright.async_api")
    module.async_playwright = async_playwright
    monkeypatch.setitem(sys.modules, "playwright.async_api", module)


@pytest.mark.asyncio
async def test_export_resume_pdf_without_debug(monkeypatch, tmp_path):
    install_playwright(monkeypatch, lambda: PlaywrightContext())
    monkeypatch.setenv("RESUME_PDF_PREVIEW_DIR", str(tmp_path))

    response = await resume.export_resume_pdf(
        resume_data(fullName=" !!! "),
        types.SimpleNamespace(query_params={"document_title": "Named Resume"}),
        USER,
    )

    assert response.body == b"%PDF-FAKE"
    assert 'filename="Named_Resume.pdf"' in response.headers["Content-Disposition"]
    preview_path = response.headers["X-PDF-Preview-Path"]
    assert preview_path.endswith("/Named_Resume.pdf")

    token = preview_path.split("/")[-2]
    preview_response = await resume.get_resume_pdf_preview(token, "Named_Resume.pdf")
    assert preview_response.filename == "Named_Resume.pdf"
    assert preview_response.path == tmp_path / f"{token}.pdf"
    assert 'filename="Named_Resume.pdf"' in preview_response.headers["content-disposition"]


@pytest.mark.asyncio
async def test_expired_resume_pdf_preview_is_removed(monkeypatch, tmp_path):
    monkeypatch.setenv("RESUME_PDF_PREVIEW_DIR", str(tmp_path))
    token = "expired-preview"
    preview_path = tmp_path / f"{token}.pdf"
    preview_path.write_bytes(b"%PDF")
    expired_time = time.time() - resume.PDF_PREVIEW_TTL_SECONDS - 1
    os.utime(preview_path, (expired_time, expired_time))

    with pytest.raises(HTTPException) as exc:
        await resume.get_resume_pdf_preview(token, "Expired.pdf")

    assert exc.value.status_code == 404
    assert not preview_path.exists()


@pytest.mark.asyncio
async def test_export_resume_pdf_import_error(monkeypatch):
    original_import = builtins.__import__

    def fail_playwright_import(name, *args, **kwargs):
        if name == "playwright.async_api":
            raise ImportError("playwright missing")
        return original_import(name, *args, **kwargs)

    monkeypatch.setattr(builtins, "__import__", fail_playwright_import)

    with pytest.raises(HTTPException) as exc:
        await resume.export_resume_pdf(
            resume_data(), types.SimpleNamespace(query_params={}), USER
        )

    assert exc.value.status_code == 500
    assert exc.value.detail == "Playwright is not installed for the client API service."


@pytest.mark.asyncio
async def test_export_resume_pdf_wraps_runtime_error(monkeypatch):
    class FailingPlaywrightContext:
        async def __aenter__(self):
            raise RuntimeError("browser failed")

        async def __aexit__(self, *_args):
            return None

    install_playwright(monkeypatch, lambda: FailingPlaywrightContext())

    with pytest.raises(HTTPException) as exc:
        await resume.export_resume_pdf(
            resume_data(), types.SimpleNamespace(query_params={}), USER
        )

    assert exc.value.status_code == 500
    assert "browser failed" in exc.value.detail
