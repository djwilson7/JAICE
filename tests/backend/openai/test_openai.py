"""Tests for the OpenAI domain.

Covers: OpenAI.OpenAI_model (extract_text_from_pdf, evaluate_resume_pdf logic,
        call_openai_chat error handling, and structured resume evaluation/overlap/tailoring logic)
        OpenAI.OpenAI_tasks (import and basic logging verification)

Note: Tests mock the OpenAI client so no live API calls are made.
"""
from __future__ import annotations

import types
import sys
import os

import pytest


def _stub_openai_client():
    """Install a minimal openai stub so OpenAI_model can be imported."""
    if "openai" in sys.modules:
        return
    openai_mod = types.ModuleType("openai")

    class _OpenAI:
        def __init__(self, **_kwargs):
            self.chat = types.SimpleNamespace(
                completions=types.SimpleNamespace(create=lambda **_kw: None)
            )

    openai_mod.OpenAI = _OpenAI
    sys.modules["openai"] = openai_mod


def _stub_pypdf2():
    """Install a minimal PyPDF2 stub."""
    if "PyPDF2" in sys.modules:
        return
    pypdf2_mod = types.ModuleType("PyPDF2")

    class PdfReader:
        def __init__(self, _stream):
            self.pages = []

    pypdf2_mod.PdfReader = PdfReader
    sys.modules["PyPDF2"] = pypdf2_mod


def _stub_dotenv():
    if "dotenv" in sys.modules:
        return
    dotenv_mod = types.ModuleType("dotenv")
    dotenv_mod.load_dotenv = lambda: None
    sys.modules["dotenv"] = dotenv_mod


# Install stubs before importing the module under test
_stub_openai_client()
_stub_pypdf2()
_stub_dotenv()

from OpenAI import OpenAI_model  # noqa: E402  (after stubs)


# ---------------------------------------------------------------------------
# OpenAI_tasks import verification
# ---------------------------------------------------------------------------

def test_openai_tasks_import():
    """Test importing OpenAI_tasks placeholders to achieve coverage."""
    import OpenAI.OpenAI_tasks
    assert OpenAI.OpenAI_tasks.logging is not None


# ---------------------------------------------------------------------------
# extract_text_from_pdf
# ---------------------------------------------------------------------------

def test_extract_text_from_pdf_empty_bytes():
    """Returns empty string when PDF parsing yields nothing."""
    result = OpenAI_model.extract_text_from_pdf(b"")
    assert isinstance(result, str)


def test_extract_text_from_pdf_with_real_pages(monkeypatch):
    """Successfully concatenates page text from reader."""

    class FakePage:
        def __init__(self, text):
            self._text = text

        def extract_text(self):
            return self._text

    class FakeReader:
        def __init__(self, _stream):
            self.pages = [FakePage("Page one content"), FakePage("Page two content")]

    monkeypatch.setattr(OpenAI_model, "PdfReader", FakeReader)
    result = OpenAI_model.extract_text_from_pdf(b"fake-pdf")
    assert "Page one content" in result
    assert "Page two content" in result


def test_extract_text_from_pdf_page_error_is_skipped(monkeypatch):
    """Pages that throw during extract_text are skipped gracefully."""

    class BrokenPage:
        def extract_text(self):
            raise ValueError("corrupt")

    class FakeReader:
        def __init__(self, _stream):
            self.pages = [BrokenPage()]

    monkeypatch.setattr(OpenAI_model, "PdfReader", FakeReader)
    result = OpenAI_model.extract_text_from_pdf(b"fake-pdf")
    assert result == ""


def test_extract_text_from_pdf_exception_handling(monkeypatch):
    """Test that extract_text_from_pdf catches exception in PdfReader construction."""
    def raise_exception(*args, **kwargs):
        raise Exception("Failed to parse PDF structure")
    monkeypatch.setattr(OpenAI_model, "PdfReader", raise_exception)
    result = OpenAI_model.extract_text_from_pdf(b"corrupt-data")
    assert result == ""


# ---------------------------------------------------------------------------
# evaluate_resume_pdf — empty PDF fast-path
# ---------------------------------------------------------------------------

def test_evaluate_resume_pdf_returns_zero_score_for_empty_pdf(monkeypatch):
    """When no text can be extracted, score=0 and a warning is returned."""
    monkeypatch.setattr(OpenAI_model, "extract_text_from_pdf", lambda _b: "")
    result = OpenAI_model.evaluate_resume_pdf(b"empty")
    assert result["score"] == 0
    assert isinstance(result["weaknesses"], list)
    assert len(result["weaknesses"]) >= 1


# ---------------------------------------------------------------------------
# call_openai_chat — error handling
# ---------------------------------------------------------------------------

def test_call_openai_chat_raises_on_failure(monkeypatch):
    """call_openai_chat raises RuntimeError when the API client throws."""

    class FailingClient:
        class chat:
            class completions:
                @staticmethod
                def create(**_kwargs):
                    raise ConnectionError("API unreachable")

    monkeypatch.setattr(OpenAI_model, "client", FailingClient())
    with pytest.raises(RuntimeError, match="OpenAI calls failed"):
        OpenAI_model.call_openai_chat("gpt-4", [{"role": "user", "content": "hi"}])


def test_call_openai_chat_returns_text_on_success(monkeypatch):
    """call_openai_chat returns raw text when the API responds successfully."""

    class FakeResponse:
        choices = [
            types.SimpleNamespace(
                message=types.SimpleNamespace(content="Great resume!")
            )
        ]

    class SuccessClient:
        class chat:
            class completions:
                @staticmethod
                def create(**_kwargs):
                    return FakeResponse()

    monkeypatch.setattr(OpenAI_model, "client", SuccessClient())
    result = OpenAI_model.call_openai_chat("gpt-4", [{"role": "user", "content": "hi"}])
    assert result["raw"] == "Great resume!"


# ---------------------------------------------------------------------------
# evaluate_resume_pdf — deep evaluation, JSON parsing, and normalization
# ---------------------------------------------------------------------------

def test_evaluate_resume_pdf_success(monkeypatch):
    """Test evaluate_resume_pdf with custom model and successful response parsing."""
    monkeypatch.setattr(OpenAI_model, "extract_text_from_pdf", lambda _b: "A very nice resume.")
    
    def mock_call_chat(model, messages, max_tokens, temperature):
        assert model == "custom-model"
        return {
            "raw": '{"score": 85, "strengths": ["Leadership", "Python"], "weaknesses": ["Lack of C++"], "suggestions": "Add C++ project.", "checklist": ["Write a C++ app"]}',
            "response": None
        }
    monkeypatch.setattr(OpenAI_model, "call_openai_chat", mock_call_chat)
    
    result = OpenAI_model.evaluate_resume_pdf(b"dummy-pdf-bytes", model="custom-model")
    assert result["score"] == 85
    assert "Leadership" in result["strengths"]
    assert "Lack of C++" in result["weaknesses"]
    assert result["suggestions"] == "Add C++ project."
    assert "Write a C++ app" in result["checklist"]
    assert "raw" in result


def test_evaluate_resume_pdf_normalization_cases(monkeypatch):
    """Test fields normalization logic including out of bounds scores and single string conversions."""
    monkeypatch.setattr(OpenAI_model, "extract_text_from_pdf", lambda _b: "Resume text.")
    
    mock_responses = [
        # Attempt 1: score 0.0-1.0 conversion, string fields to lists
        {
            "raw": '{"score": 0.85, "strengths": "Communication", "weaknesses": "None", "suggestions": "Great", "checklist": "Keep it up"}',
            "response": None
        },
        # Attempt 2: invalid score value (string) and null fields
        {
            "raw": '{"score": "not-a-number", "strengths": null, "weaknesses": null, "suggestions": null, "checklist": null}',
            "response": None
        },
        # Attempt 3: score out of bounds (> 100) and spaces trimming
        {
            "raw": '{"score": 150, "strengths": ["   Cleaned   "], "weaknesses": ["   "], "suggestions": "   ", "checklist": ["   Task   "]}',
            "response": None
        }
    ]
    
    response_iterator = iter(mock_responses)
    def mock_call_chat(*args, **kwargs):
        return next(response_iterator)
        
    monkeypatch.setattr(OpenAI_model, "call_openai_chat", mock_call_chat)
    
    # Test case 1
    res1 = OpenAI_model.evaluate_resume_pdf(b"bytes")
    assert res1["score"] == 85
    assert res1["strengths"] == ["Communication"]
    assert res1["weaknesses"] == ["None"]
    assert res1["checklist"] == ["Keep it up"]
    
    # Test case 2
    res2 = OpenAI_model.evaluate_resume_pdf(b"bytes")
    assert res2["score"] == 0
    assert res2["strengths"] == []
    assert res2["weaknesses"] == []
    assert res2["checklist"] == []
    assert res2["suggestions"] == "None"
    
    # Test case 3
    res3 = OpenAI_model.evaluate_resume_pdf(b"bytes")
    assert res3["score"] == 100
    assert res3["strengths"] == ["Cleaned"]
    assert res3["weaknesses"] == []
    assert res3["checklist"] == ["Task"]


def test_evaluate_resume_pdf_json_parse_error(monkeypatch):
    """Test JSON parsing failure fallback in evaluate_resume_pdf."""
    monkeypatch.setattr(OpenAI_model, "extract_text_from_pdf", lambda _b: "Resume text.")
    
    def mock_call_chat(*args, **kwargs):
        return {"raw": "This is not JSON at all.", "response": None}
    monkeypatch.setattr(OpenAI_model, "call_openai_chat", mock_call_chat)
    
    result = OpenAI_model.evaluate_resume_pdf(b"bytes")
    assert result["score"] == 0
    assert result["strengths"] == []
    assert result["weaknesses"] == []
    assert result["suggestions"] == "This is not JSON at all."
    assert result["raw"] == "This is not JSON at all."


# ---------------------------------------------------------------------------
# improve_resume_bullet
# ---------------------------------------------------------------------------

def test_improve_resume_bullet(monkeypatch):
    """Test improve_resume_bullet with environmental and explicit models/context."""
    def mock_call_chat(model, messages, max_tokens, temperature):
        assert model == "custom-model"
        assert max_tokens == 120
        assert temperature == 0.3
        return {"raw": "Improved bullet point content.", "response": None}
        
    monkeypatch.setattr(OpenAI_model, "call_openai_chat", mock_call_chat)
    
    # With context
    res = OpenAI_model.improve_resume_bullet(
        bullet_text="Wrote python code",
        job_title="Software Engineer",
        company="ACME Corp",
        model="custom-model"
    )
    assert res["improved_bullet"] == "Improved bullet point content."
    
    # Without context and default model from environment
    monkeypatch.setenv("OPENAI_RESUME_MODEL", "env-model")
    def mock_call_chat_env(model, messages, max_tokens, temperature):
        assert model == "env-model"
        return {"raw": "Another improved bullet.", "response": None}
    monkeypatch.setattr(OpenAI_model, "call_openai_chat", mock_call_chat_env)
    
    res2 = OpenAI_model.improve_resume_bullet(bullet_text="Wrote code")
    assert res2["improved_bullet"] == "Another improved bullet."


# ---------------------------------------------------------------------------
# improve_resume_summary
# ---------------------------------------------------------------------------

def test_improve_resume_summary(monkeypatch):
    """Test improve_resume_summary with target role and explicit model."""
    def mock_call_chat(model, messages, max_tokens, temperature):
        assert model == "custom-model"
        assert max_tokens == 200
        assert temperature == 0.3
        return {"raw": "Improved summary content.", "response": None}
    monkeypatch.setattr(OpenAI_model, "call_openai_chat", mock_call_chat)
    
    res = OpenAI_model.improve_resume_summary(
        summary_text="Experienced engineer",
        target_role="Lead Architect",
        model="custom-model"
    )
    assert res["improved_summary"] == "Improved summary content."
    
    # Without target role and default model
    monkeypatch.setenv("OPENAI_RESUME_MODEL", "env-model")
    def mock_call_chat_env(model, messages, max_tokens, temperature):
        assert model == "env-model"
        return {"raw": "Default summary.", "response": None}
    monkeypatch.setattr(OpenAI_model, "call_openai_chat", mock_call_chat_env)
    
    res2 = OpenAI_model.improve_resume_summary(summary_text="Experienced developer")
    assert res2["improved_summary"] == "Default summary."


# ---------------------------------------------------------------------------
# _structured_resume_to_text
# ---------------------------------------------------------------------------

def test_structured_resume_to_text():
    """Test conversion of structured resume dictionary to plain text."""
    # Full case
    resume_data = {
        "fullName": "John Doe",
        "location": "Boston, MA",
        "phone": "123-456-7890",
        "email": "john.doe@example.com",
        "linkedin": "linkedin.com/in/johndoe",
        "website": "johndoe.com",
        "github": "github.com/johndoe",
        "customContact": [{"value": "Custom Contact Field"}],
        "summary": "Fullstack developer with 5 years of experience.",
        "experience": [
            {
                "jobTitle": "Software Engineer",
                "company": "ACME Corp",
                "location": "Remote",
                "startDate": "2020-01-01",
                "endDate": "2023-01-01",
                "bullets": [
                    "Developed features using React and Node.",
                    {"text": "Optimized database queries."}
                ]
            }
        ],
        "education": [
            {
                "school": "University of Boston",
                "degree": "B.S. in Computer Science",
                "startDate": "2016-09-01",
                "endDate": "2020-05-01"
            }
        ],
        "skills": [
            {"category": "Languages", "items": ["Python", "JavaScript"]},
            {"category": "Frameworks", "items": ["Django", "React"]}
        ]
    }
    
    text = OpenAI_model._structured_resume_to_text(resume_data)
    assert "John Doe" in text
    assert "Boston, MA | 123-456-7890 | john.doe@example.com" in text
    assert "Custom Contact Field" in text
    assert "Fullstack developer" in text
    assert "Software Engineer | ACME Corp | Remote | 2020-01-01 - 2023-01-01" in text
    assert "Developed features using React" in text
    assert "Optimized database queries." in text
    assert "B.S. in Computer Science | University of Boston" in text
    assert "Languages: Python, JavaScript" in text
    assert "Frameworks: Django, React" in text
    
    # Hidden fields case
    resume_hidden = {
        "name": "Jane Smith",
        "email": "jane@example.com",
        "phone": "555-5555",
        "hiddenContactFields": ["phone"]
    }
    text_hidden = OpenAI_model._structured_resume_to_text(resume_hidden)
    assert "jane@example.com" in text_hidden
    assert "555-5555" not in text_hidden
    
    # Skills string list case
    resume_str_skills = {
        "skills": ["Python", "JavaScript", ""]
    }
    text_skills = OpenAI_model._structured_resume_to_text(resume_str_skills)
    assert "Python, JavaScript" in text_skills
    
    # Empty / invalid skills case
    resume_invalid_skills = {
        "skills": "not-a-list"
    }
    text_invalid_skills = OpenAI_model._structured_resume_to_text(resume_invalid_skills)
    assert "Skills" not in text_invalid_skills
    
    # Dictionary skill with invalid items
    resume_dict_invalid = {
        "skills": [{"category": "Languages", "items": "not-a-list"}]
    }
    assert OpenAI_model._structured_resume_to_text(resume_dict_invalid) == ""

    # Additional edge cases to cover all branches in _structured_resume_to_text
    resume_extra = {
        "fullName": "Test Extra",
        "customContact": [
            {"value": "Valid Custom"},
            {"not-value": "Invalid Custom"},
            "not-a-dict"
        ],
        "experience": [
            {
                "jobTitle": "",
                "company": "",
                "location": "",
                "startDate": "",
                "endDate": "",
                "bullets": [
                    "",
                    {"text": ""},
                    {"not-text": "invalid"}
                ]
            }
        ],
        "education": [
            {
                "degree": "",
                "school": "",
                "startDate": "",
                "endDate": ""
            }
        ],
        "skills": [
            {"category": "Languages", "items": ["Python"]},
            "not-a-dict",
            {"category": "EmptyCategory", "items": []}
        ]
    }
    text_extra = OpenAI_model._structured_resume_to_text(resume_extra)
    assert "Valid Custom" in text_extra
    assert "Invalid Custom" not in text_extra
    assert "Languages: Python" in text_extra
    assert "EmptyCategory" not in text_extra


# ---------------------------------------------------------------------------
# evaluate_resume_structured
# ---------------------------------------------------------------------------

def test_evaluate_resume_structured(monkeypatch):
    """Test structured resume evaluation function including validation fast-paths."""
    # Fast path (empty)
    empty_res = OpenAI_model.evaluate_resume_structured({})
    assert empty_res["score"] == 0
    assert "Resume appears to be empty" in empty_res["weaknesses"][0]
    
    # Normal path
    resume_data = {"fullName": "John Doe", "summary": "Developer"}
    def mock_call_chat(model, messages, max_tokens, temperature):
        return {"raw": '{"score": 90, "strengths": ["Coding"], "weaknesses": [], "suggestions": "None", "checklist": ["Do nothing"]}'}
    monkeypatch.setattr(OpenAI_model, "call_openai_chat", mock_call_chat)
    
    res = OpenAI_model.evaluate_resume_structured(resume_data, model="structured-model")
    assert res["score"] == 90
    assert "Coding" in res["strengths"]
    
    # Parse error path
    def mock_call_chat_error(*args, **kwargs):
        return {"raw": "Internal Server Error"}
    monkeypatch.setattr(OpenAI_model, "call_openai_chat", mock_call_chat_error)
    res_err = OpenAI_model.evaluate_resume_structured(resume_data)
    assert res_err["score"] == 0
    assert res_err["suggestions"] == "Internal Server Error"


def test_evaluate_resume_structured_normalization_cases(monkeypatch):
    """Test fields normalization logic in evaluate_resume_structured."""
    resume_data = {"fullName": "John Doe", "summary": "Developer"}
    
    mock_responses = [
        # Attempt 1: score 0.0-1.0 conversion, string fields to lists
        {
            "raw": '{"score": 0.85, "strengths": "Communication", "weaknesses": "None", "suggestions": "Great", "checklist": "Keep it up"}',
            "response": None
        },
        # Attempt 2: invalid score value (string) and null fields
        {
            "raw": '{"score": "not-a-number", "strengths": null, "weaknesses": null, "suggestions": null, "checklist": null}',
            "response": None
        },
    ]
    
    response_iterator = iter(mock_responses)
    def mock_call_chat(*args, **kwargs):
        return next(response_iterator)
        
    monkeypatch.setattr(OpenAI_model, "call_openai_chat", mock_call_chat)
    
    # Test case 1
    res1 = OpenAI_model.evaluate_resume_structured(resume_data)
    assert res1["score"] == 85
    assert res1["strengths"] == ["Communication"]
    assert res1["weaknesses"] == ["None"]
    assert res1["checklist"] == ["Keep it up"]
    
    # Test case 2
    res2 = OpenAI_model.evaluate_resume_structured(resume_data)
    assert res2["score"] == 0
    assert res2["strengths"] == []
    assert res2["weaknesses"] == []
    assert res2["checklist"] == []
    assert res2["suggestions"] == "None"


# ---------------------------------------------------------------------------
# analyze_job_overlap_ai
# ---------------------------------------------------------------------------

def test_analyze_job_overlap_ai(monkeypatch):
    """Test job description overlap analysis function."""
    resume_data = {"fullName": "John Doe", "summary": "Developer"}
    
    # Success path
    def mock_call_chat(model, messages, max_tokens, temperature):
        return {
            "raw": '{"match_score": 75, "position_summary": "Summary of role", "key_requirements": ["Python"], "overlap_analysis": ["Django"], "gaps_analysis": ["Java"], "actionable_suggestions": ["Learn Java"]}'
        }
    monkeypatch.setattr(OpenAI_model, "call_openai_chat", mock_call_chat)
    
    res = OpenAI_model.analyze_job_overlap_ai(resume_data, "Need python and java dev", model="overlap-model")
    assert res["match_score"] == 75
    assert res["position_summary"] == "Summary of role"
    assert res["key_requirements"] == ["Python"]
    assert res["overlap_analysis"] == ["Django"]
    assert res["gaps_analysis"] == ["Java"]
    assert res["actionable_suggestions"] == ["Learn Java"]
    
    # Parse error path
    def mock_call_chat_error(*args, **kwargs):
        return {"raw": "Bad json response"}
    monkeypatch.setattr(OpenAI_model, "call_openai_chat", mock_call_chat_error)
    
    res_err = OpenAI_model.analyze_job_overlap_ai(resume_data, "Description")
    assert res_err["match_score"] == 0
    assert "Failed to parse" in res_err["position_summary"]
    assert "API response parsing error" in res_err["gaps_analysis"]


# ---------------------------------------------------------------------------
# tailor_resume_ai
# ---------------------------------------------------------------------------

def test_tailor_resume_ai(monkeypatch):
    """Test tailoring resume function."""
    resume_data = {"fullName": "John Doe", "summary": "Developer"}
    
    # Success path
    def mock_call_chat(model, messages, max_tokens, temperature):
        return {
            "raw": '{"tailored_resume_data": {"fullName": "John Doe", "summary": "Tailored Developer"}, "changes": [{"path": "summary", "before": "Developer", "after": "Tailored Developer", "reason": "alignment"}], "warnings": ["Missing AWS"]}'
        }
    monkeypatch.setattr(OpenAI_model, "call_openai_chat", mock_call_chat)
    
    res = OpenAI_model.tailor_resume_ai(resume_data, "Tailored Job", model="tailor-model")
    assert res["tailored_resume_data"]["summary"] == "Tailored Developer"
    assert res["changes"][0]["path"] == "summary"
    assert res["warnings"] == ["Missing AWS"]
    
    # Parse error path
    def mock_call_chat_error(*args, **kwargs):
        return {"raw": "Garbage output"}
    monkeypatch.setattr(OpenAI_model, "call_openai_chat", mock_call_chat_error)
    
    res_err = OpenAI_model.tailor_resume_ai(resume_data, "Tailored Job")
    assert res_err["tailored_resume_data"] == resume_data
    assert res_err["changes"] == []
    assert "Failed to parse" in res_err["warnings"][0]
