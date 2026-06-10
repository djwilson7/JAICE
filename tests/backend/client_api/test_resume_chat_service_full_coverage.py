from __future__ import annotations

import json
from collections import deque
from types import SimpleNamespace

import pytest

from client_api.services.resume_chat import service
from client_api.services.resume_chat.schemas import (
    LLMResponse,
    ResumeAnalysis,
    ResumeChatRequest,
    ResumeChatResponse,
    ResumeChatHistoryMessage,
    ResumeRewriteBulletInput,
    ResumeRewriteSectionRequest,
    ResumeRewriteSectionResponse,
    TailorSuggestions,
)


class FakeProvider:
    def __init__(self, *, generated=(), streamed=()):
        self.generated = deque(generated)
        self.streamed = deque(streamed)
        self.generate_calls = []
        self.stream_calls = []

    async def generate(self, **kwargs):
        self.generate_calls.append(kwargs)
        return LLMResponse(text=self.generated.popleft())

    async def stream(self, **kwargs):
        self.stream_calls.append(kwargs)
        for chunk in self.streamed.popleft():
            yield chunk


def _rewrite_request(*, target="summary", summary_text="Backend engineer.", bullets=(), guidance=None):
    return ResumeRewriteSectionRequest(
        target=target,
        summary_text=summary_text,
        experience_id="exp-1",
        role_title="Engineer",
        company="Acme",
        bullets=list(bullets),
        guidance=guidance,
    )


def _bullet(index=0, text="Built APIs.", item_id="bullet-1"):
    return ResumeRewriteBulletInput(id=item_id, index=index, text=text)


def _rewrite_json(*, summary=(), bullets=(), assistant_message="Updated."):
    return json.dumps(
        {
            "assistant_message": assistant_message,
            "tailor_suggestions": {
                "summary": list(summary),
                "experience_bullets": list(bullets),
            },
        }
    )


def _chat_request(message="hello", *, context=None, resume_data=None, history=()):
    return ResumeChatRequest(
        message=message,
        context=context,
        resume_data=resume_data or {},
        history=list(history),
    )


def test_text_token_and_entity_helpers(monkeypatch):
    assert service._cap_text(None, 3) == ""
    assert service._cap_text("abcd", 3) == "abc"

    assert service._normalize_rewrite_token("Owner's") == "owner"
    assert service._normalize_rewrite_token("parties") == "party"
    assert service._normalize_rewrite_token("running") == "run"
    assert service._normalize_rewrite_token("testing") == "test"
    assert service._normalize_rewrite_token("going") == "going"
    assert service._normalize_rewrite_token("tested") == "test"
    assert service._normalize_rewrite_token("boxes") == "box"
    assert service._normalize_rewrite_token("cats") == "cat"
    assert service._normalize_rewrite_token("glass") == "glass"
    assert service._normalize_rewrite_token("plain") == "plain"
    assert service._rewrite_token_variants("") == set()
    assert service._rewrite_token_variants("create") == {"create", "creat"}
    assert service._unique_rewrite_terms(["api", "api", "sql"]) == ["api", "sql"]

    entries = service._significant_rewrite_token_entries("a x ai 7 APIs")
    assert [item[1] for item in entries] == ["ai", "7", "api"]
    assert service._significant_rewrite_tokens("Built APIs")
    assert "api" in service._rewrite_source_variants("Built APIs")

    assert service._looks_like_new_tool_or_named_entity("") is False
    assert service._looks_like_new_tool_or_named_entity("C++") is True
    assert service._looks_like_new_tool_or_named_entity("API") is True
    assert service._looks_like_new_tool_or_named_entity("Docker") is True
    assert service._looks_like_new_tool_or_named_entity("plain") is False

    assert service._rewrite_number_values("Improved 1,200 requests by 25%.") == {"1200", "25%"}

    class Match:
        def __init__(self, value):
            self.value = value

        def group(self, _index):
            return self.value

    monkeypatch.setattr(service, "_REWRITE_NUMBER_RE", SimpleNamespace(finditer=lambda _text: [Match("letters"), Match("3")]))
    assert service._rewrite_number_values("ignored") == {"3"}


def test_grounding_helpers_cover_supported_and_unsupported_paths():
    assert service._unsupported_rewrite_tokens("Built APIs.", "Built APIs.") == []
    assert service._unsupported_rewrite_tokens("Responsible for APIs.", "Built APIs.") == []
    unsupported = service._unsupported_rewrite_tokens("Built APIs.", "Built Docker APIs for 50 users.")
    assert unsupported == ["docker", "user", "50"]
    assert service._new_rewrite_tokens("Responsible for APIs.", "Built clear API endpoints.") == ["clear", "endpoint"]

    assert service._source_bound_rewrite("", " Better ", "reason") == ("Better", "reason", [])
    assert service._source_bound_rewrite("Built APIs.", "", "reason") == ("", "reason", [])
    assert service._source_bound_rewrite("Built APIs.", "Built APIs.", "reason") == ("Built APIs.", "reason", [])
    rejected = service._source_bound_rewrite(
        "Built APIs.",
        "Built clear concise public API endpoints.",
        "reason",
        max_new_terms=2,
    )
    assert rejected[0] == "Built APIs."
    assert rejected[1] == service.UNSUPPORTED_REWRITE_REASON
    assert rejected[2]


def test_partial_json_draft_and_retry_helpers():
    assert service._decode_partial_json_string(r"line\nnext") == "line\nnext"
    assert service._decode_partial_json_string("unfinished\\") == "unfinished"
    assert service._decode_partial_json_string(r"\q") == r"\q"
    assert service._partial_json_string_values('{"suggested_text":"one"}', "suggested_text") == ["one"]

    summary = _rewrite_request()
    assert service._rewrite_draft_values(summary, "{}") == []
    assert service._rewrite_draft_values(summary, '{"suggested_text":" first "}') == [(None, "first")]

    experience = _rewrite_request(target="experience", bullets=[_bullet(2), _bullet(3, " "), _bullet(4)])
    values = service._rewrite_draft_values(
        experience,
        '{"suggested_text":" two ","suggested_text":" four ","suggested_text":" ignored "}',
    )
    assert values == [(2, "two"), (4, "four")]

    retry = service._rewrite_retry_request(summary, [])
    assert "previous rewrite added unsupported details" in retry.guidance
    retry = service._rewrite_retry_request(_rewrite_request(guidance="Keep short."), ["one", "two"])
    assert retry.guidance.startswith("Keep short.")
    assert "one; two" in retry.guidance


def test_intent_and_casual_conversation_helpers():
    assert service.infer_resume_chat_intent("How can I tailor my resume?") == "conversation"
    assert service.infer_resume_chat_intent("Compare", "my resume to this role") == "analysis"
    assert service.infer_resume_chat_intent("Compare these values") == "conversation"
    assert service.infer_resume_chat_intent("Please revise this summary") == "tailor_suggestions"
    assert service.infer_resume_chat_intent("hello") == "conversation"

    assert service.is_casual_conversation("hello", context="job") is False
    assert service.is_casual_conversation("...") is True
    assert service.is_casual_conversation("review my resume") is False
    assert service.is_casual_conversation("thanks") is True
    assert service.is_casual_conversation("hello there") is True
    assert service.is_casual_conversation("hello " + "x" * 200) is False
    assert service.is_casual_conversation("explain decorators") is False


def test_resume_sanitization_and_history_capping():
    resume = {
        "fullName": "A",
        "summary": "Summary",
        "experience": [
            "skip",
            {
                "id": "exp",
                "jobTitle": "Engineer",
                "company": "Acme",
                "bullets": ["skip", {"id": "b", "text": "Built APIs"}],
            },
        ],
        "education": ["skip", {"school": "State", "degree": "BS", "details": ["skip", {"id": "d", "text": "CS"}]}],
        "skills": ["skip", {"category": "Languages", "items": None}],
    }
    sanitized = service._sanitize_resume_data(resume, "conversation")
    assert sanitized["experience"][0]["bullets"] == [{"id": "b", "text": "Built APIs"}]
    assert sanitized["education"][0]["details"] == [{"id": "d", "text": "CS"}]
    assert sanitized["skills"] == [{"category": "Languages", "items": []}]

    tailor = service._sanitize_resume_data(resume, "tailor_suggestions")
    assert "education" not in tailor
    assert "skills" not in tailor

    history = [
        ResumeChatHistoryMessage(sender="assistant", text=" "),
        *[ResumeChatHistoryMessage(sender="assistant", text=str(index)) for index in range(12)],
    ]
    messages = service._history_to_messages(_chat_request(message="x" * 9000, history=history))
    assert messages[0].content == "2"
    assert len(messages[-1].content) == service.MAX_MESSAGE_CHARS


def test_json_string_score_and_analysis_helpers():
    assert service._extract_json_object('{"a": 1}') == {"a": 1}
    assert service._extract_json_object("[1]") is None
    assert service._extract_json_object("```json\n{\"a\": 1}\n```") == {"a": 1}
    assert service._extract_json_object("```\n[1]\n```") is None
    assert service._extract_json_object("prefix {\"a\": 1} suffix") == {"a": 1}
    assert service._extract_json_object("prefix {bad} suffix") is None
    assert service._extract_json_object("none") is None

    assert service._string_list(" item ") == ["item"]
    assert service._string_list(" ") == []
    assert service._string_list(None) == []
    assert service._string_list([" one ", "", 2]) == ["one", "2"]

    assert service._normalize_score("bad") == 0
    assert service._normalize_score(0.75) == 75
    assert service._normalize_score(-5) == 0
    assert service._normalize_score(500) == 100

    class MappingLike:
        @staticmethod
        def get(_key):
            return None

    assert service._parse_analysis(MappingLike()) is None
    analysis = service._parse_analysis({"analysis": {"match_score": 0.5, "requirements": " Python "}})
    assert analysis.match_score == 50
    assert analysis.requirements == ["Python"]
    assert service._parse_analysis({"match_score": 90}).match_score == 90


def test_experience_lookup_and_tailor_parser_edges():
    resume = {
        "summary": "Backend engineer",
        "experience": [
            "skip",
            {"bullets": ["skip", {"text": "Built APIs."}]},
            {"id": "exp", "jobTitle": "Engineer", "bullets": [{"text": "Created reports."}]},
        ],
    }
    lookup = service._experience_lookup(resume)
    assert lookup[(None, 1)]["text"] == "Built APIs."
    assert lookup[("exp", 0)]["role_title"] == "Engineer"
    assert service._parse_tailor_suggestions({}, resume) is None

    issues = []
    suggestions = service._parse_tailor_suggestions(
        {
            "tailor_suggestions": {
                "summary": [
                    "skip",
                    {"suggested_text": "", "reason": "skip"},
                    {"suggested_text": "Backend engineer with Docker.", "reason": "specific"},
                ],
                "experience_bullets": [
                    "skip",
                    {"bullet_index": "bad"},
                    {"bullet_index": 8, "suggested_text": "no match", "reason": "skip"},
                    {"experience_id": "exp", "bullet_index": 0, "suggested_text": "", "reason": "skip"},
                    {
                        "experience_id": "exp",
                        "bullet_index": 0,
                        "suggested_text": "Created strategic reports.",
                        "reason": "specific",
                    },
                ],
            }
        },
        resume,
        validation_issues=issues,
    )
    assert suggestions.summary[0].suggested_text == "Backend engineer"
    assert suggestions.experience_bullets[0].suggested_text == "Created reports."
    assert len(issues) == 2

    without_issues = service._parse_tailor_suggestions(
        {
            "tailor_suggestions": {
                "summary": [{"suggested_text": "Backend engineer with Docker.", "reason": "specific"}],
                "experience_bullets": [],
            }
        },
        resume,
    )
    assert without_issues.summary[0].suggested_text == "Backend engineer"


def test_options_prompts_and_minimal_resume(monkeypatch):
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

    assert service.get_mode_options("ask")["num_predict"] == 450
    assert service.get_mode_options("tailor")["num_predict"] == 650
    assert service.get_mode_options("analyze")["num_predict"] == 1000
    assert service.get_mode_options("unknown")["num_predict"] == 1000
    assert service.get_rewrite_options()["num_predict"] == 450
    assert "Return a single JSON object" in service._rewrite_system_prompt()

    summary = _rewrite_request(summary_text="x" * 7000)
    assert "Improve clarity" in service._build_section_rewrite_prompt(summary)
    assert len(service._minimal_rewrite_resume(summary)["summary"]) == service.MAX_REWRITE_TEXT_CHARS

    experience = _rewrite_request(target="experience", bullets=[_bullet(), _bullet(1, " ")], guidance="Shorter.")
    assert "Shorter." in service._build_section_rewrite_prompt(experience)
    minimal = service._minimal_rewrite_resume(experience)
    assert minimal["summary"] == ""
    assert len(minimal["experience"][0]["bullets"]) == 1


@pytest.mark.asyncio
async def test_generate_rewrite_guards_and_retry_paths(monkeypatch):
    empty_summary = await service.generate_resume_rewrite_suggestion(_rewrite_request(summary_text=" "))
    assert "Add summary" in empty_summary.assistant_message
    empty_bullets = await service.generate_resume_rewrite_suggestion(_rewrite_request(target="experience", bullets=[]))
    assert "Add at least one" in empty_bullets.assistant_message

    first = _rewrite_json(
        bullets=[
            {
                "experience_id": "exp-1",
                "bullet_index": 0,
                "suggested_text": "Built Docker APIs.",
                "reason": "specific",
            }
        ]
    )
    no_suggestions = _rewrite_json()
    provider = FakeProvider(generated=[first, no_suggestions])
    monkeypatch.setattr(service, "get_resume_llm_provider", lambda: provider)
    request = _rewrite_request(target="experience", bullets=[_bullet()])
    response = await service.generate_resume_rewrite_suggestion(request)
    assert response.tailor_suggestions.experience_bullets[0].suggested_text == "Built APIs."
    assert len(provider.generate_calls) == 2

    provider = FakeProvider(
        generated=[
            _rewrite_json(summary=[{"suggested_text": "Backend engineer.", "reason": "same"}]),
        ]
    )
    monkeypatch.setattr(service, "get_resume_llm_provider", lambda: provider)
    assert (await service.generate_resume_rewrite_suggestion(_rewrite_request())).tailor_suggestions.summary

    accepted = _rewrite_json(
        bullets=[{"bullet_index": 0, "suggested_text": "Built APIs.", "reason": "concise"}]
    )
    provider = FakeProvider(generated=[first, accepted])
    monkeypatch.setattr(service, "get_resume_llm_provider", lambda: provider)
    response = await service.generate_resume_rewrite_suggestion(request)
    assert response.tailor_suggestions.experience_bullets[0].reason == "concise"

    direct = await service._generate_resume_rewrite_once(
        FakeProvider(generated=[_rewrite_json(summary=[{"suggested_text": "Backend engineer.", "reason": "same"}])]),
        _rewrite_request(),
        {"temperature": 0.1, "num_predict": 12},
    )
    assert direct[0].tailor_suggestions.summary
    assert direct[1] == []
    assert service._has_rewrite_suggestions(direct[0]) is True
    assert service._has_rewrite_suggestions(ResumeRewriteSectionResponse(assistant_message="", tailor_suggestions=TailorSuggestions())) is False


def test_rewrite_response_from_model_text_edges():
    summary_request = _rewrite_request()
    malformed = service._rewrite_response_from_model_text(summary_request, "bad")
    assert malformed.assistant_message == service.UNSTRUCTURED_REWRITE_MESSAGE

    response = service._rewrite_response_from_model_text(
        summary_request,
        json.dumps({"tailor_suggestions": "bad"}),
    )
    assert response.assistant_message == '{"tailor_suggestions": "bad"}'
    assert response.tailor_suggestions.summary == []

    experience = _rewrite_request(target="experience", bullets=[_bullet()])
    response = service._rewrite_response_from_model_text(
        experience,
        _rewrite_json(
            summary=[{"suggested_text": "Ignored", "reason": "ignored"}],
            bullets=[{"bullet_index": 0, "suggested_text": "Built APIs.", "reason": "same"}],
        ),
    )
    assert response.tailor_suggestions.summary == []
    assert response.tailor_suggestions.experience_bullets


@pytest.mark.asyncio
async def test_stream_rewrite_guards_retry_and_parse_fallback(monkeypatch):
    summary_events = [json.loads(item) async for item in service.stream_resume_rewrite_suggestion(_rewrite_request(summary_text=" "))]
    assert [event["event"] for event in summary_events] == ["error", "done"]
    bullet_events = [
        json.loads(item)
        async for item in service.stream_resume_rewrite_suggestion(_rewrite_request(target="experience", bullets=[]))
    ]
    assert [event["event"] for event in bullet_events] == ["error", "done"]

    invalid = _rewrite_json(
        bullets=[{"bullet_index": 0, "suggested_text": "Built Docker APIs.", "reason": "specific"}]
    )
    valid = _rewrite_json(
        bullets=[{"bullet_index": 0, "suggested_text": "Built APIs.", "reason": "concise"}]
    )
    provider = FakeProvider(streamed=[[invalid], [valid]])
    monkeypatch.setattr(service, "get_resume_llm_provider", lambda: provider)
    events = [
        json.loads(item)
        async for item in service.stream_resume_rewrite_suggestion(
            _rewrite_request(target="experience", bullets=[_bullet()])
        )
    ]
    assert len(provider.stream_calls) == 2
    assert any(event["event"] == "delta" for event in events)
    structured = next(event for event in events if event["event"] == "structured")
    assert structured["tailor_suggestions"]["experience_bullets"][0]["suggested_text"] == "Built APIs."

    provider = FakeProvider(streamed=[[invalid], [_rewrite_json()]])
    monkeypatch.setattr(service, "get_resume_llm_provider", lambda: provider)
    events = [
        json.loads(item)
        async for item in service.stream_resume_rewrite_suggestion(
            _rewrite_request(target="experience", bullets=[_bullet()])
        )
    ]
    assert next(event for event in events if event["event"] == "structured")["tailor_suggestions"]["experience_bullets"]

    monkeypatch.setattr(service, "_rewrite_response_from_model_text", lambda *_args, **_kwargs: None)
    provider = FakeProvider(streamed=[["{}"]])
    monkeypatch.setattr(service, "get_resume_llm_provider", lambda: provider)
    fallback = [
        json.loads(item)
        async for item in service.stream_resume_rewrite_suggestion(_rewrite_request())
    ]
    assert next(event for event in fallback if event["event"] == "structured")["assistant_message"] == "Failed to parse resume rewrite response."

    with monkeypatch.context() as patch:
        provider = FakeProvider(streamed=[["{}"]])
        patch.setattr(service, "get_resume_llm_provider", lambda: provider)
        patch.setattr(
            service,
            "_rewrite_draft_values",
            lambda *_args: [(None, ""), (None, "draft"), (None, "draft")],
        )
        suppressed = [
            json.loads(item)
            async for item in service.stream_resume_rewrite_suggestion(_rewrite_request())
        ]
    assert [event["event"] for event in suppressed].count("delta") == 1


@pytest.mark.asyncio
async def test_generate_chat_analysis_tailor_and_conversation(monkeypatch):
    provider = FakeProvider(
        generated=[
            "hello",
            "plain analysis",
            json.dumps({"assistant_message": "", "analysis": {"match_score": 0.8}}),
            _rewrite_json(summary=[{"suggested_text": "Backend engineer.", "reason": "same"}], assistant_message="tailored"),
        ]
    )
    monkeypatch.setattr(service, "get_resume_llm_provider", lambda: provider)

    conversation = await service.generate_resume_chat_response(_chat_request())
    assert conversation.intent == "conversation"
    plain = await service.generate_resume_chat_response(_chat_request("Compare my resume to this job description"))
    assert plain.assistant_message == "plain analysis"
    analysis = await service.generate_resume_chat_response(_chat_request("Compare my resume to this job description"))
    assert analysis.analysis.match_score == 80
    assert analysis.assistant_message.startswith('{"assistant_message": ""')
    tailor = await service.generate_resume_chat_response(
        _chat_request("Please rewrite my summary", resume_data={"summary": "Backend engineer."})
    )
    assert tailor.tailor_suggestions.summary


@pytest.mark.asyncio
async def test_stream_chat_conversation_and_structured_paths(monkeypatch):
    provider = FakeProvider(streamed=[["one", "two"], []])
    monkeypatch.setattr(service, "get_resume_llm_provider", lambda: provider)
    events = [json.loads(item) async for item in service.stream_resume_chat_response(_chat_request("hello"))]
    assert [event["event"] for event in events] == ["intent", "delta", "delta", "done"]

    events = [
        json.loads(item)
        async for item in service.stream_resume_chat_response(_chat_request("review my resume"))
    ]
    assert [event["event"] for event in events] == ["intent", "done"]

    responses = deque(
        [
            ResumeChatResponse(intent="analysis", assistant_message="", analysis=None),
            ResumeChatResponse(
                intent="analysis",
                assistant_message="analysis",
                analysis=ResumeAnalysis(match_score=80),
            ),
            ResumeChatResponse(
                intent="tailor_suggestions",
                assistant_message="tailor",
                tailor_suggestions=TailorSuggestions(),
            ),
        ]
    )

    async def generate(_request):
        return responses.popleft()

    monkeypatch.setattr(service, "generate_resume_chat_response", generate)
    no_payload = [
        json.loads(item)
        async for item in service.stream_resume_chat_response(_chat_request("Compare my resume to this job"))
    ]
    assert [event["event"] for event in no_payload] == ["intent", "done"]
    analysis = [
        json.loads(item)
        async for item in service.stream_resume_chat_response(_chat_request("Compare my resume to this job"))
    ]
    assert [event["event"] for event in analysis] == ["intent", "delta", "structured", "done"]
    tailor = [
        json.loads(item)
        async for item in service.stream_resume_chat_response(_chat_request("Please rewrite my summary"))
    ]
    assert [event["event"] for event in tailor] == ["intent", "delta", "structured", "done"]
