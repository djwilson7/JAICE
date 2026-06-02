from __future__ import annotations

import sys
import types
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import pytest
from fastapi import HTTPException

from client_api.api import resume
from client_api.services.resume_chat import prompts
from client_api.services.resume_chat import providers
from client_api.services.resume_chat import service as resume_service
from client_api.services.resume_chat.providers import ResumeLLMProviderUnavailable


class Request:
    def __init__(self, query_params: dict[str, str] | None = None) -> None:
        self.query_params = query_params or {}


class Transaction:
    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return None


class ResumeConn:
    def __init__(self, *, rows=None, row=None, exists=True) -> None:
        self.rows = rows or []
        self.row = row
        self.exists = exists
        self.executed = []
        self.fetchrow_calls = []
        self.fetchval_calls = []

    def transaction(self):
        return Transaction()

    async def fetch(self, query, *args):
        return self.rows

    async def fetchrow(self, query, *args):
        self.fetchrow_calls.append((query, args))
        return self.row

    async def fetchval(self, query, *args):
        self.fetchval_calls.append((query, args))
        return 1 if self.exists else None

    async def execute(self, query, *args):
        self.executed.append((query, args))
        return "OK"


@asynccontextmanager
async def conn_context(conn):
    yield conn


def sample_resume_data(**overrides):
    payload = {
        "fullName": "Avery Applicant",
        "email": "avery@example.com",
        "phone": "555-111-2222",
        "location": "Austin, TX",
        "website": "https://avery.dev",
        "linkedin": "linkedin.com/in/avery",
        "github": "github.com/avery",
        "summary": "Builder of useful systems.",
        "experience": [
            {
                "id": "exp-1",
                "jobTitle": "Software Engineer",
                "company": "Acme",
                "location": "Remote",
                "startDate": "2021",
                "endDate": "Present",
                "bullets": [
                    {"id": "b1", "text": "Built APIs."},
                    {"id": "b2", "text": ""},
                ],
            }
        ],
        "education": [
            {
                "id": "edu-1",
                "school": "State University",
                "degree": "BS Computer Science",
                "startDate": "2017",
                "endDate": "2021",
                "details": [{"id": "d1", "text": "Dean's List"}],
            }
        ],
        "skills": ["Python", "TypeScript", "SQL"],
        "customContact": [{"label": "Portfolio", "value": "portfolio.example.com"}],
        "hiddenContactFields": ["phone"],
        "formatting": {
            "pageSize": "letter",
            "titleFontSize": 28,
            "headerFontSize": 15,
            "bodyFontSize": 11,
            "pageMarginPt": 36,
            "paperLayoutFormat": "compact",
        },
    }
    payload.update(overrides)
    return resume.ResumeData(**payload)


def row(**overrides):
    now = datetime(2026, 6, 2, tzinfo=timezone.utc)
    data = {
        "id": uuid.UUID("11111111-1111-1111-1111-111111111111"),
        "name": "Master",
        "is_master": True,
        "schema_version": 1,
        "source_resume_id": None,
        "resume_data": sample_resume_data().model_dump_json(),
        "target_job_title": "Engineer",
        "target_job_description": "Build systems",
        "created_at": now,
        "updated_at": now,
    }
    data.update(overrides)
    return data


def test_resume_models_and_render_helpers(monkeypatch, tmp_path):
    assert resume.SkillCategory(items="Python, TypeScript, , SQL").items == [
        "Python",
        "TypeScript",
        "SQL",
    ]
    normalized = resume.ResumeData(fullName="A", skills=["Python", "SQL"])
    assert normalized.skills[0].category == "Skills"
    assert [item for item in normalized.skills[0].items] == ["Python", "SQL"]

    request = Request({"debug_pdf": "1"})
    assert resume._resume_pdf_debug_enabled(request) is True
    monkeypatch.delenv("RESUME_PDF_DEBUG_HOST_DIR", raising=False)
    assert resume._resume_pdf_debug_host_path("x.json") is None
    monkeypatch.setenv("RESUME_PDF_DEBUG_HOST_DIR", "C:/host/debug")
    assert str(resume._resume_pdf_debug_host_path("x.json")).endswith("x.json")
    monkeypatch.setenv("RESUME_PDF_DEBUG_DIR", str(tmp_path))
    assert resume._resume_pdf_debug_dir() == tmp_path

    font_file = tmp_path / "font.ttf"
    font_file.write_bytes(b"font")
    assert resume._font_data_uri(font_file).startswith("data:font/ttf;base64,")
    assert resume._font_data_uri(tmp_path / "missing.ttf") is None
    assert isinstance(resume._font_face_css(), str)

    assert resume._paper_dimensions("letter") == ("8.5in", "11in", "Letter")
    assert resume._paper_dimensions("bad") == ("210mm", "297mm", "A4")
    assert resume._paper_viewport_dimensions("Letter") == {"width": 816, "height": 1056}
    assert resume._paper_viewport_dimensions("A4") == {"width": 794, "height": 1123}
    assert resume._safe_text(" <b>Name</b> ") == "&lt;b&gt;Name&lt;/b&gt;"

    payload = sample_resume_data()
    contact_items = resume._render_contact_items(payload)
    assert "555-111-2222" not in contact_items
    assert "portfolio.example.com" in contact_items
    assert "contact-strip" in resume._render_contact_html(payload)

    document, width, height, page_name, margin = resume._render_resume_pdf_html(payload)
    assert page_name == "Letter"
    assert width == "8.5in"
    assert height == "11in"
    assert margin == 36
    assert "Avery Applicant" in document
    assert "Work Experience" in document
    assert "State University" in document
    assert "Python, TypeScript, SQL" in document

    empty_doc, *_ = resume._render_resume_pdf_html(
        resume.ResumeData(fullName="", summary="", experience=[], education=[], skills=[])
    )
    assert "Your Name" in empty_doc


@pytest.mark.asyncio
async def test_resume_crud_endpoints(monkeypatch, user):
    list_conn = ResumeConn(rows=[row(source_resume_id=uuid.UUID("22222222-2222-2222-2222-222222222222"))])
    monkeypatch.setattr(resume, "get_connection", lambda: conn_context(list_conn))
    listed = await resume.list_resumes(user)
    assert listed["resumes"][0]["id"] == "11111111-1111-1111-1111-111111111111"
    assert listed["resumes"][0]["source_resume_id"] == "22222222-2222-2222-2222-222222222222"
    assert isinstance(listed["resumes"][0]["resume_data"], dict)

    save_conn = ResumeConn(row=row(is_master=True))
    monkeypatch.setattr(resume, "get_connection", lambda: conn_context(save_conn))
    saved = await resume.save_resume(
        resume.SaveResumeRequest(
            name="Master",
            is_master=True,
            source_resume_id="22222222-2222-2222-2222-222222222222",
            resume_data=sample_resume_data(),
        ),
        user,
    )
    assert saved["status"] == "success"
    assert save_conn.executed

    with pytest.raises(HTTPException) as bad_source:
        await resume.save_resume(
            resume.SaveResumeRequest(
                name="Bad",
                source_resume_id="not-a-uuid",
                resume_data=sample_resume_data(),
            ),
            user,
        )
    assert bad_source.value.status_code == 400

    update_conn = ResumeConn(row=row(name="Updated"), exists=True)
    monkeypatch.setattr(resume, "get_connection", lambda: conn_context(update_conn))
    updated = await resume.update_resume(
        "11111111-1111-1111-1111-111111111111",
        resume.UpdateResumeRequest(name="Updated", is_master=True, resume_data=sample_resume_data()),
        user,
    )
    assert updated["resume"]["name"] == "Updated"

    with pytest.raises(HTTPException) as bad_update_id:
        await resume.update_resume(
            "bad-id",
            resume.UpdateResumeRequest(name="Updated", resume_data=sample_resume_data()),
            user,
        )
    assert bad_update_id.value.status_code == 400

    missing_conn = ResumeConn(row=row(), exists=False)
    monkeypatch.setattr(resume, "get_connection", lambda: conn_context(missing_conn))
    with pytest.raises(HTTPException) as missing:
        await resume.update_resume(
            "11111111-1111-1111-1111-111111111111",
            resume.UpdateResumeRequest(name="Missing", resume_data=sample_resume_data()),
            user,
        )
    assert missing.value.status_code == 404

    delete_conn = ResumeConn(exists=True)
    monkeypatch.setattr(resume, "get_connection", lambda: conn_context(delete_conn))
    deleted = await resume.delete_resume("11111111-1111-1111-1111-111111111111", user)
    assert deleted == {"status": "success", "deleted_id": "11111111-1111-1111-1111-111111111111"}
    assert delete_conn.executed

    missing_delete = ResumeConn(exists=False)
    monkeypatch.setattr(resume, "get_connection", lambda: conn_context(missing_delete))
    with pytest.raises(HTTPException) as delete_missing:
        await resume.delete_resume("11111111-1111-1111-1111-111111111111", user)
    assert delete_missing.value.status_code == 404


def install_openai_stub(monkeypatch):
    module = types.ModuleType("OpenAI.OpenAI_model")
    module.evaluate_resume_pdf = lambda contents: {"score": 90, "bytes": len(contents)}
    module.improve_resume_bullet = lambda **kwargs: {"improved_bullet": f"Improved {kwargs['bullet_text']}"}
    module.improve_resume_summary = lambda **kwargs: {"improved_summary": f"Improved {kwargs['summary_text']}"}
    module.evaluate_resume_structured = lambda payload: {
        "score": 88,
        "strengths": ["Clear"],
        "weaknesses": ["Short"],
        "suggestions": "Add metrics",
        "checklist": ["Metrics"],
        "raw": "ok",
    }
    module.tailor_resume_ai = lambda **kwargs: {
        "tailored_resume_data": kwargs["resume_data"],
        "changes": [{"path": "summary", "before": "old", "after": "new", "reason": "targeted"}],
        "warnings": [],
    }
    module.analyze_job_overlap_ai = lambda **kwargs: {
        "match_score": 80,
        "position_summary": "Engineer",
        "key_requirements": ["Python"],
        "overlap_analysis": ["Python"],
        "gaps_analysis": ["Cloud"],
        "actionable_suggestions": ["Add cloud"],
    }
    monkeypatch.setitem(sys.modules, "OpenAI.OpenAI_model", module)


class Upload:
    filename = "resume.pdf"
    content_type = "application/pdf"

    async def read(self):
        return b"%PDF"


@pytest.mark.asyncio
async def test_resume_ai_helper_endpoints(monkeypatch, user):
    install_openai_stub(monkeypatch)
    assert await resume.upload_resume(Upload(), user) == {"score": 90, "bytes": 4}

    bad_upload = types.SimpleNamespace(filename="resume.txt", content_type="text/plain", read=lambda: b"")
    with pytest.raises(HTTPException) as bad_file:
        await resume.upload_resume(bad_upload, user)
    assert bad_file.value.status_code == 400

    bullet = await resume.improve_bullet(resume.ImproveBulletRequest(bullet_text="Built APIs"), user)
    assert bullet.improved_bullet == "Improved Built APIs"

    summary = await resume.improve_summary(resume.ImproveSummaryRequest(summary_text="Engineer"), user)
    assert summary.improved_summary == "Improved Engineer"

    evaluated = await resume.evaluate_resume_structured_endpoint(sample_resume_data(), user)
    assert evaluated.score == 88

    tailored = await resume.tailor_resume_endpoint(
        resume.TailorResumeRequest(resume_data=sample_resume_data(), job_description="Python"),
        user,
    )
    assert tailored.tailored_resume_data.fullName == "Avery Applicant"

    analysis = await resume.analyze_listing_endpoint(
        resume.TailorResumeRequest(resume_data=sample_resume_data(), job_description="Python"),
        user,
    )
    assert analysis.match_score == 80


@pytest.mark.asyncio
async def test_resume_chat_streaming_endpoints(monkeypatch, user):
    async def stream_chat(_payload):
        yield "one\n"
        yield "two\n"

    async def stream_rewrite(_payload):
        yield "rewrite\n"

    monkeypatch.setattr(resume, "stream_resume_chat_response", stream_chat)
    monkeypatch.setattr(resume, "stream_resume_rewrite_suggestion", stream_rewrite)
    monkeypatch.setattr(
        resume,
        "generate_resume_rewrite_suggestion",
        lambda _payload: resume.ResumeRewriteSectionResponse(
            assistant_message="ok",
            tailor_suggestions={"summary": [], "experience_bullets": []},
        ),
    )

    chat_response = await resume.resume_chat_stream_endpoint(
        resume.ResumeChatRequest(message="hello", resume_data={}),
        user,
    )
    chunks = []
    async for chunk in chat_response.body_iterator:
        chunks.append(chunk)
    assert chunks == ["one\n", "two\n"]

    rewrite_payload = resume.ResumeRewriteSectionRequest(target="summary", summary_text="Old")
    rewrite_response = await resume.resume_rewrite_suggestion_stream_endpoint(rewrite_payload, user)
    rewrite_chunks = []
    async for chunk in rewrite_response.body_iterator:
        rewrite_chunks.append(chunk)
    assert rewrite_chunks == ["rewrite\n"]

    async def unavailable_chat(_payload):
        raise ResumeLLMProviderUnavailable("model unavailable")
        yield ""

    async def failing_chat(_payload):
        raise RuntimeError("boom")
        yield ""

    async def unavailable_rewrite(_payload):
        raise ResumeLLMProviderUnavailable("rewrite unavailable")
        yield ""

    async def failing_rewrite(_payload):
        raise RuntimeError("boom")
        yield ""

    monkeypatch.setattr(resume, "stream_resume_chat_response", unavailable_chat)
    unavailable_response = await resume.resume_chat_stream_endpoint(
        resume.ResumeChatRequest(message="hello", resume_data={}),
        user,
    )
    unavailable_chunks = []
    async for chunk in unavailable_response.body_iterator:
        unavailable_chunks.append(chunk)
    assert "model unavailable" in unavailable_chunks[0]

    monkeypatch.setattr(resume, "stream_resume_chat_response", failing_chat)
    failing_response = await resume.resume_chat_stream_endpoint(
        resume.ResumeChatRequest(message="hello", resume_data={}),
        user,
    )
    failing_chunks = []
    async for chunk in failing_response.body_iterator:
        failing_chunks.append(chunk)
    assert "Failed to stream resume chat response" in failing_chunks[0]

    monkeypatch.setattr(resume, "stream_resume_rewrite_suggestion", unavailable_rewrite)
    unavailable_rewrite_response = await resume.resume_rewrite_suggestion_stream_endpoint(rewrite_payload, user)
    unavailable_rewrite_chunks = []
    async for chunk in unavailable_rewrite_response.body_iterator:
        unavailable_rewrite_chunks.append(chunk)
    assert "rewrite unavailable" in unavailable_rewrite_chunks[0]

    monkeypatch.setattr(resume, "stream_resume_rewrite_suggestion", failing_rewrite)
    failing_rewrite_response = await resume.resume_rewrite_suggestion_stream_endpoint(rewrite_payload, user)
    failing_rewrite_chunks = []
    async for chunk in failing_rewrite_response.body_iterator:
        failing_rewrite_chunks.append(chunk)
    assert "Failed to stream resume rewrite suggestion" in failing_rewrite_chunks[0]

    async def unavailable_generate(_payload):
        raise ResumeLLMProviderUnavailable("no model")

    async def failing_generate(_payload):
        raise RuntimeError("boom")

    monkeypatch.setattr(resume, "generate_resume_rewrite_suggestion", unavailable_generate)
    with pytest.raises(HTTPException) as unavailable_exc:
        await resume.resume_rewrite_suggestion_endpoint(rewrite_payload, user)
    assert unavailable_exc.value.status_code == 503

    monkeypatch.setattr(resume, "generate_resume_rewrite_suggestion", failing_generate)
    with pytest.raises(HTTPException) as failing_exc:
        await resume.resume_rewrite_suggestion_endpoint(rewrite_payload, user)
    assert failing_exc.value.status_code == 500


@pytest.mark.asyncio
async def test_resume_diagnostics_and_pdf_export(monkeypatch, tmp_path, user):
    monkeypatch.setenv("RESUME_PDF_DEBUG_DIR", str(tmp_path))
    monkeypatch.setenv("RESUME_PDF_DEBUG_HOST_DIR", "C:/host/debug")

    with pytest.raises(HTTPException) as disabled:
        await resume.save_resume_render_diagnostics(Request(), {"ok": True}, user)
    assert disabled.value.status_code == 404

    saved = await resume.save_resume_render_diagnostics(
        Request({"debug_pdf": "1"}),
        {"ok": True},
        user,
    )
    assert saved["status"] == "success"
    assert (tmp_path / "frontend-render-diagnostics-latest.json").exists()
    assert saved["host_latest_path"].endswith("frontend-render-diagnostics-latest.json")

    class Page:
        async def set_content(self, *_args, **_kwargs):
            return None

        async def emulate_media(self, *_args, **_kwargs):
            return None

        async def evaluate(self, *_args, **_kwargs):
            return {"metrics": True}

        async def screenshot(self, *_args, **_kwargs):
            return None

        async def pdf(self, **kwargs):
            self.pdf_options = kwargs
            return b"%PDF-FAKE"

    class Browser:
        def __init__(self):
            self.page = Page()
            self.closed = False

        async def new_page(self, **kwargs):
            self.viewport = kwargs["viewport"]
            return self.page

        async def close(self):
            self.closed = True

    class Chromium:
        async def launch(self, **kwargs):
            self.launch_options = kwargs
            return Browser()

    class Playwright:
        def __init__(self):
            self.chromium = Chromium()

    class PlaywrightContext:
        async def __aenter__(self):
            return Playwright()

        async def __aexit__(self, *_args):
            return None

    playwright_module = types.ModuleType("playwright.async_api")
    playwright_module.async_playwright = lambda: PlaywrightContext()
    monkeypatch.setitem(sys.modules, "playwright.async_api", playwright_module)

    response = await resume.export_resume_pdf(sample_resume_data(), Request({"debug_pdf": "1"}), user)
    assert response.media_type == "application/pdf"
    assert response.body == b"%PDF-FAKE"
    assert "Avery_Applicant.pdf" in response.headers["Content-Disposition"]
    assert (tmp_path / "resume-export.html").exists()


def test_resume_prompt_builders_cover_sparse_and_structured_inputs():
    assert prompts.resume_context_to_text({}) == "No resume content was provided."
    context = prompts.resume_context_to_text(
        {
            "fullName": "Avery",
            "summary": "Builder",
            "experience": [
                {
                    "id": "exp-1",
                    "jobTitle": "Engineer",
                    "company": "Acme",
                    "bullets": [{"text": "Built APIs"}, "Reduced toil", {"text": ""}],
                },
                "not-a-dict",
                {"bullets": "not-list"},
            ],
            "skills": [
                {"category": "Languages", "items": ["Python", "", "SQL"]},
                {"category": "", "items": ["Docker"]},
                "bad",
            ],
            "education": [
                {"school": "State", "degree": "BS", "details": [{"text": "Honors"}, "Capstone"]},
                {"school": "", "degree": ""},
                "bad",
            ],
        }
    )
    assert "Candidate: Avery" in context
    assert "Role 1 (exp-1): Engineer - Acme" in context
    assert "[1] Reduced toil" in context
    assert "Languages: Python, SQL" in context
    assert "State - BS" in context

    assert "conversational assistant" in prompts.build_system_prompt("conversation")
    assert "Tailor suggestions" in prompts.build_system_prompt("tailor_suggestions")
    assert "Intent: Analysis" in prompts.build_system_prompt("analysis")

    tailor_prompt = prompts.build_user_prompt("tailor_suggestions", "Tailor this", {}, context="Job")
    assert "Return only JSON" in tailor_prompt
    analysis_prompt = prompts.build_user_prompt("analysis", "Compare", {}, context=None)
    assert "empty analysis arrays" in analysis_prompt
    conversation_prompt = prompts.build_user_prompt(
        "conversation",
        "Hi",
        {"fullName": "Avery"},
        context="extra",
        include_resume_context=False,
    )
    assert "Additional context" in conversation_prompt
    assert "Optional resume context" not in conversation_prompt


def test_resume_provider_helpers_and_option_defaults(monkeypatch):
    monkeypatch.setenv("RESUME_LLM_TIMEOUT_SECONDS", "bad")
    assert providers._timeout_seconds() == 60.0
    monkeypatch.setenv("RESUME_LLM_TIMEOUT_SECONDS", "0.2")
    assert providers._timeout_seconds() == 1.0

    assert providers._response_error_text('{"error": "missing"}') == "missing"
    assert providers._response_error_text('{"message": "bad"}') == "bad"
    assert providers._response_error_text("plain error") == "plain error"
    assert "needs more memory" in providers._ollama_unavailable_message("large", "requires more system memory")
    assert "ollama pull missing" in providers._ollama_unavailable_message("missing", "not found")
    assert providers._ollama_unavailable_message("ok", "unknown") == providers.LOCAL_MODEL_UNAVAILABLE_MESSAGE

    monkeypatch.setenv("RESUME_LLM_PROVIDER", "openai")
    assert isinstance(providers.get_resume_llm_provider(), providers.OpenAIResumeLLMProvider)
    monkeypatch.setenv("RESUME_LLM_PROVIDER", "unsupported")
    with pytest.raises(providers.ResumeLLMProviderError):
        providers.get_resume_llm_provider()

    for key in [
        "RESUME_CONVERSATION_NUM_CTX",
        "RESUME_CONVERSATION_NUM_PREDICT",
        "RESUME_CONVERSATION_TEMPERATURE",
        "RESUME_CONVERSATION_TOP_K",
        "RESUME_TAILOR_NUM_CTX",
        "RESUME_TAILOR_NUM_PREDICT",
        "RESUME_TAILOR_TEMPERATURE",
        "RESUME_TAILOR_TOP_K",
        "RESUME_ANALYZE_NUM_CTX",
        "RESUME_ANALYZE_NUM_PREDICT",
        "RESUME_ANALYZE_TEMPERATURE",
        "RESUME_ANALYZE_TOP_K",
        "RESUME_REWRITE_NUM_CTX",
        "RESUME_REWRITE_NUM_PREDICT",
        "RESUME_REWRITE_TEMPERATURE",
        "RESUME_REWRITE_TOP_K",
    ]:
        monkeypatch.setenv(key, "bad")

    assert resume_service.get_intent_options("conversation") == {
        "temperature": 0.35,
        "num_predict": 450,
        "num_ctx": 2048,
        "top_k": 30,
    }
    assert resume_service.get_intent_options("tailor_suggestions") == {
        "temperature": 0.25,
        "num_predict": 650,
        "num_ctx": 2048,
        "top_k": 30,
    }
    assert resume_service.get_intent_options("analysis") == {
        "temperature": 0.2,
        "num_predict": 1000,
        "num_ctx": 4096,
        "top_k": 30,
    }
    assert resume_service.get_mode_options("ask")["num_predict"] == 450
    assert resume_service.get_mode_options("tailor")["num_predict"] == 650
    assert resume_service.get_mode_options("analyze")["num_predict"] == 1000
    assert resume_service.get_rewrite_options() == {
        "temperature": 0.05,
        "num_predict": 450,
        "num_ctx": 1536,
        "top_k": 30,
    }
