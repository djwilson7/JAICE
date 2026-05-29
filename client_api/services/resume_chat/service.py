from __future__ import annotations

import json
import os
import re
from typing import Any, AsyncIterator

from client_api.services.resume_chat.prompts import build_system_prompt, build_user_prompt
from client_api.services.resume_chat.providers import get_resume_llm_provider
from client_api.services.resume_chat.schemas import (
    ExperienceBulletSuggestion,
    LLMMessage,
    ResumeAnalysis,
    ResumeChatRequest,
    ResumeChatResponse,
    ResumeChatIntent,
    ResumeChatStreamEvent,
    ResumeRewriteSectionRequest,
    ResumeRewriteSectionResponse,
    ResumeRewriteStreamEvent,
    TailorSuggestions,
)


MAX_MESSAGE_CHARS = 8000
MAX_CONTEXT_CHARS = 12000
MAX_HISTORY_MESSAGES = 10
MAX_REWRITE_TEXT_CHARS = 6000
MAX_REWRITE_GUIDANCE_CHARS = 1500
MAX_BULLET_REWRITE_NEW_TERMS = 3
UNSUPPORTED_REWRITE_REASON = (
    "Kept original wording because the generated rewrite introduced unsupported details not present in the source text."
)
UNSTRUCTURED_REWRITE_MESSAGE = "Jaice did not return a reviewable rewrite. Please try again."

_REWRITE_TOKEN_RE = re.compile(r"[A-Za-z0-9][A-Za-z0-9+.#/-]*")
_REWRITE_NUMBER_RE = re.compile(r"(?:[$€£]\s*)?\d[\d,]*(?:\.\d+)?\s*(?:%|[kKmMbB]\+?)?")
_REWRITE_STOPWORDS = {
    "a",
    "an",
    "and",
    "as",
    "at",
    "are",
    "be",
    "been",
    "by",
    "for",
    "from",
    "in",
    "into",
    "is",
    "it",
    "its",
    "of",
    "on",
    "or",
    "that",
    "the",
    "their",
    "these",
    "this",
    "through",
    "those",
    "to",
    "using",
    "via",
    "was",
    "were",
    "with",
    "within",
}
_REWRITE_PROTECTED_SHORT_TOKENS = {"ai", "bi", "ci", "cd", "go", "js", "ml", "qa", "r", "ts", "ui", "ux"}
_REWRITE_HIGH_RISK_UNSUPPORTED_TERMS = {
    "adoption",
    "availability",
    "aws",
    "azure",
    "business",
    "client",
    "clients",
    "compliance",
    "conversion",
    "core",
    "cost",
    "customer",
    "customers",
    "decision",
    "decision-making",
    "decisions",
    "docker",
    "enterprise",
    "executive",
    "fastapi",
    "gcp",
    "growth",
    "high-throughput",
    "impact",
    "insight",
    "insightful",
    "insights",
    "javascript",
    "kafka",
    "kubernetes",
    "latency",
    "leadership",
    "mission-critical",
    "mongodb",
    "nosql",
    "ownership",
    "platform",
    "postgres",
    "postgresql",
    "product",
    "production",
    "python",
    "react",
    "redis",
    "reliable",
    "reliability",
    "revenue",
    "scale",
    "scalable",
    "secure",
    "security",
    "sql",
    "stakeholder",
    "stakeholders",
    "strategic",
    "tableau",
    "team",
    "teams",
    "terraform",
    "typescript",
    "users",
    "workflow",
    "workflows",
}
_REWRITE_ACTION_VERBS = {
    "accelerate",
    "administer",
    "analyze",
    "architect",
    "automate",
    "build",
    "built",
    "coordinate",
    "coordinated",
    "create",
    "created",
    "deliver",
    "delivered",
    "design",
    "designed",
    "develop",
    "developed",
    "drive",
    "drove",
    "engineer",
    "engineered",
    "execute",
    "executed",
    "implement",
    "implemented",
    "improve",
    "improved",
    "lead",
    "led",
    "maintain",
    "maintained",
    "manage",
    "managed",
    "migrate",
    "migrated",
    "optimize",
    "optimized",
    "partner",
    "partnered",
    "reduce",
    "reduced",
    "refactor",
    "refactored",
    "resolve",
    "resolved",
    "ship",
    "shipped",
    "streamline",
    "streamlined",
    "support",
    "supported",
}


def _cap_text(value: str | None, max_chars: int) -> str:
    return (value or "")[:max_chars]


def _normalize_rewrite_token(token: str) -> str:
    token = token.lower().strip(".,;:!?()[]{}\"'")
    if token.endswith("'s"):
        token = token[:-2]
    if len(token) > 4 and token.endswith("ies"):
        return token[:-3] + "y"
    if len(token) > 5 and token.endswith("ing"):
        base = token[:-3]
        return base[:-1] if len(base) > 3 and base[-1] == base[-2] else base
    if len(token) > 4 and token.endswith("ed"):
        return token[:-2]
    if len(token) > 4 and token.endswith("es"):
        return token[:-2]
    if len(token) > 3 and token.endswith("s") and not token.endswith("ss"):
        return token[:-1]
    return token


def _rewrite_token_variants(token: str) -> set[str]:
    normalized = _normalize_rewrite_token(token)
    variants = {normalized}
    if len(normalized) > 4 and normalized.endswith("e"):
        variants.add(normalized[:-1])
    return {variant for variant in variants if variant}


_REWRITE_ACTION_VERB_STEMS = {
    variant
    for verb in _REWRITE_ACTION_VERBS
    for variant in _rewrite_token_variants(verb)
}
_REWRITE_HIGH_RISK_UNSUPPORTED_STEMS = {
    variant
    for term in _REWRITE_HIGH_RISK_UNSUPPORTED_TERMS
    for variant in _rewrite_token_variants(term)
}


def _unique_rewrite_terms(tokens: list[str]) -> list[str]:
    seen: set[str] = set()
    unique: list[str] = []
    for token in tokens:
        if token in seen:
            continue
        seen.add(token)
        unique.append(token)
    return unique


def _rewrite_source_variants(text: str) -> set[str]:
    return {
        variant
        for _, variants in _significant_rewrite_tokens(text)
        for variant in variants
    }


def _significant_rewrite_tokens(text: str) -> list[tuple[str, set[str]]]:
    return [(normalized, variants) for _, normalized, variants in _significant_rewrite_token_entries(text)]


def _significant_rewrite_token_entries(text: str) -> list[tuple[str, str, set[str]]]:
    tokens: list[tuple[str, str, set[str]]] = []
    for match in _REWRITE_TOKEN_RE.finditer(text):
        raw = match.group(0)
        normalized = _normalize_rewrite_token(raw)
        if not normalized or normalized in _REWRITE_STOPWORDS:
            continue
        if len(normalized) <= 2 and normalized not in _REWRITE_PROTECTED_SHORT_TOKENS and not any(char.isdigit() for char in normalized):
            continue
        tokens.append((raw, normalized, _rewrite_token_variants(raw)))
    return tokens


def _looks_like_new_tool_or_named_entity(raw: str) -> bool:
    stripped = raw.strip(".,;:!?()[]{}\"'")
    if not stripped:
        return False
    if re.search(r"[+#/.]", stripped):
        return True
    if len(stripped) > 2 and stripped.isupper():
        return True
    return bool(len(stripped) > 3 and stripped[0].isupper() and any(char.islower() for char in stripped[1:]))


def _rewrite_number_values(text: str) -> set[str]:
    values: set[str] = set()
    for match in _REWRITE_NUMBER_RE.finditer(text):
        raw = match.group(0)
        digits = re.sub(r"\D", "", raw)
        if digits:
            values.add(f"{digits}%" if "%" in raw else digits)
    return values


def _unsupported_rewrite_tokens(current_text: str, suggested_text: str) -> list[str]:
    source_variants = _rewrite_source_variants(current_text)
    unsupported: list[str] = []

    for index, (raw, token, variants) in enumerate(_significant_rewrite_token_entries(suggested_text)):
        if source_variants.intersection(variants):
            continue
        if index == 0 and _REWRITE_ACTION_VERB_STEMS.intersection(variants):
            continue
        if _REWRITE_HIGH_RISK_UNSUPPORTED_STEMS.intersection(variants) or _looks_like_new_tool_or_named_entity(raw):
            unsupported.append(token)

    current_numbers = _rewrite_number_values(current_text)
    for number in sorted(_rewrite_number_values(suggested_text) - current_numbers):
        unsupported.append(number)

    return _unique_rewrite_terms(unsupported)


def _new_rewrite_tokens(current_text: str, suggested_text: str) -> list[str]:
    source_variants = _rewrite_source_variants(current_text)
    new_tokens: list[str] = []
    for index, (_, token, variants) in enumerate(_significant_rewrite_token_entries(suggested_text)):
        if source_variants.intersection(variants):
            continue
        if index == 0 and _REWRITE_ACTION_VERB_STEMS.intersection(variants):
            continue
        new_tokens.append(token)
    return _unique_rewrite_terms(new_tokens)


def _source_bound_rewrite(
    current_text: str,
    suggested_text: str,
    reason: str,
    *,
    max_new_terms: int | None = None,
) -> tuple[str, str, list[str]]:
    current = current_text.strip()
    suggested = suggested_text.strip()
    if not current or not suggested:
        return suggested, reason, []

    unsupported = _unsupported_rewrite_tokens(current, suggested)
    if max_new_terms is not None:
        new_terms = _new_rewrite_tokens(current, suggested)
        if len(new_terms) > max_new_terms:
            unsupported = _unique_rewrite_terms([*unsupported, *new_terms])

    if not unsupported:
        return suggested, reason, []

    return (
        current,
        UNSUPPORTED_REWRITE_REASON,
        unsupported,
    )


def _decode_partial_json_string(raw: str) -> str:
    cleaned = raw
    while cleaned.endswith("\\"):
        cleaned = cleaned[:-1]
    try:
        return str(json.loads(f'"{cleaned}"'))
    except json.JSONDecodeError:
        return (
            cleaned
            .replace(r"\\", "\\")
            .replace(r"\"", '"')
            .replace(r"\n", "\n")
            .replace(r"\t", "\t")
        )


def _partial_json_string_values(buffer: str, key: str) -> list[str]:
    pattern = re.compile(rf'"{re.escape(key)}"\s*:\s*"((?:\\.|[^"\\])*)')
    return [_decode_partial_json_string(match.group(1)) for match in pattern.finditer(buffer)]


def _rewrite_draft_values(request: ResumeRewriteSectionRequest, buffer: str) -> list[tuple[int | None, str]]:
    values = [value.strip() for value in _partial_json_string_values(buffer, "suggested_text") if value.strip()]
    if request.target == "summary":
        return [(None, values[0])] if values else []

    source_indexes = [item.index for item in request.bullets if item.text.strip()]
    return [
        (source_indexes[position], value)
        for position, value in enumerate(values[: len(source_indexes)])
    ]


def _rewrite_retry_request(request: ResumeRewriteSectionRequest, validation_issues: list[str]) -> ResumeRewriteSectionRequest:
    issue_text = "; ".join(validation_issues[:4]) or "the previous rewrite added unsupported details"
    retry_guidance = (
        "Retry because the previous rewrite was rejected for unsupported details: "
        f"{issue_text}. Keep each rewrite grounded in that bullet's exact source text. Focus on concise wording, trimming filler, "
        "and starting with a direct action verb when possible. Do not broaden the claim, add scope, add adjectives, "
        "add business impact, add tools, add metrics, borrow details from another bullet, or imply production/customer/team context unless those facts are already present in the same bullet. "
        "If no grounded improvement is possible, return the original text unchanged."
    )
    guidance = "\n\n".join(part for part in [request.guidance or "", retry_guidance] if part).strip()
    return request.model_copy(update={"guidance": _cap_text(guidance, MAX_REWRITE_GUIDANCE_CHARS)})


def infer_resume_chat_intent(message: str, context: str | None = None) -> ResumeChatIntent:
    text = f"{message} {context or ''}".lower()
    normalized = re.sub(r"\s+", " ", text).strip()

    conversational_tailor_patterns = (
        "how do i tailor",
        "how should i tailor",
        "how can i tailor",
        "tips for tailoring",
        "advice for tailoring",
    )
    if any(pattern in normalized for pattern in conversational_tailor_patterns):
        return "conversation"

    analysis_terms = (
        "match score",
        "score my resume",
        "how well",
        "fit for",
        "good fit",
        "role fit",
        "alignment",
        "align with",
        "compare",
        "gap",
        "gaps",
        "missing keyword",
        "missing keywords",
        "job description",
        "job listing",
        "posting",
        "requirements",
    )
    if any(term in normalized for term in analysis_terms) and (
        "resume" in normalized or "job" in normalized or "role" in normalized or "listing" in normalized or "description" in normalized
    ):
        return "analysis"

    rewrite_terms = (
        "rewrite",
        "reword",
        "revise",
        "improve",
        "make this sound",
        "suggest wording",
        "suggest better",
        "replacement",
        "tailor my summary",
        "tailor these",
        "tailor the bullet",
        "tailor my bullet",
        "tailor my bullets",
    )
    resume_section_terms = (
        "summary",
        "bullet",
        "bullets",
        "experience",
        "work experience",
        "resume line",
    )
    if any(term in normalized for term in rewrite_terms) and any(term in normalized for term in resume_section_terms):
        return "tailor_suggestions"

    return "conversation"


def is_casual_conversation(message: str, context: str | None = None) -> bool:
    if context and context.strip():
        return False

    normalized = re.sub(r"[^\w\s']", " ", message.lower())
    normalized = re.sub(r"\s+", " ", normalized).strip()
    if not normalized:
        return True

    resume_terms = (
        "resume",
        "job",
        "career",
        "interview",
        "application",
        "cover letter",
        "linkedin",
        "summary",
        "bullet",
        "experience",
        "skill",
        "role",
        "listing",
        "posting",
    )
    if any(term in normalized for term in resume_terms):
        return False

    casual_exact = {
        "hi",
        "hello",
        "hey",
        "yo",
        "sup",
        "thanks",
        "thank you",
        "ok",
        "okay",
        "cool",
        "nice",
        "sounds good",
        "how are you",
        "how's it going",
        "hows it going",
        "what's up",
        "whats up",
        "good morning",
        "good afternoon",
        "good evening",
    }
    if normalized in casual_exact:
        return True

    casual_prefixes = (
        "hi ",
        "hello ",
        "hey ",
        "thanks ",
        "thank you ",
        "how are you",
        "how's it going",
        "hows it going",
        "what's up",
        "whats up",
    )
    return any(normalized.startswith(prefix) for prefix in casual_prefixes) and len(normalized) <= 160


def _sanitize_resume_data(resume: dict[str, Any], intent: str) -> dict[str, Any]:
    sanitized: dict[str, Any] = {
        "fullName": resume.get("fullName"),
        "summary": resume.get("summary"),
        "experience": [],
    }

    if intent != "tailor_suggestions":
        sanitized["education"] = []
        sanitized["skills"] = []

    for item in resume.get("experience") or []:
        if not isinstance(item, dict):
            continue
        sanitized["experience"].append(
            {
                "id": item.get("id"),
                "jobTitle": item.get("jobTitle"),
                "company": item.get("company"),
                "startDate": item.get("startDate"),
                "endDate": item.get("endDate"),
                "bullets": [
                    {"id": bullet.get("id"), "text": bullet.get("text")}
                    for bullet in (item.get("bullets") or [])
                    if isinstance(bullet, dict)
                ],
            }
        )

    if intent != "tailor_suggestions":
        for item in resume.get("education") or []:
            if isinstance(item, dict):
                sanitized["education"].append(
                    {
                        "school": item.get("school"),
                        "degree": item.get("degree"),
                        "details": [
                            {"id": detail.get("id"), "text": detail.get("text")}
                            for detail in (item.get("details") or [])
                            if isinstance(detail, dict)
                        ],
                    }
                )

        for item in resume.get("skills") or []:
            if isinstance(item, dict):
                sanitized["skills"].append(
                    {
                        "category": item.get("category"),
                        "items": item.get("items") or [],
                    }
                )

    return sanitized


def _history_to_messages(request: ResumeChatRequest) -> list[LLMMessage]:
    recent = request.history[-MAX_HISTORY_MESSAGES:]
    messages = [
        LLMMessage(role=item.sender, content=_cap_text(item.text, MAX_MESSAGE_CHARS))
        for item in recent
        if item.text.strip()
    ]
    messages.append(LLMMessage(role="user", content=_cap_text(request.message, MAX_MESSAGE_CHARS)))
    return messages


def _extract_json_object(text: str) -> dict[str, Any] | None:
    try:
        parsed = json.loads(text)
        return parsed if isinstance(parsed, dict) else None
    except json.JSONDecodeError:
        pass

    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip(), flags=re.IGNORECASE | re.MULTILINE)
    try:
        parsed = json.loads(cleaned)
        return parsed if isinstance(parsed, dict) else None
    except json.JSONDecodeError:
        pass

    start = text.find("{")
    end = text.rfind("}")
    if start >= 0 and end > start:
        try:
            parsed = json.loads(text[start : end + 1])
            return parsed if isinstance(parsed, dict) else None
        except json.JSONDecodeError:
            return None

    return None


def _string_list(value: Any) -> list[str]:
    if isinstance(value, str):
        return [value.strip()] if value.strip() else []
    if not isinstance(value, list):
        return []
    return [str(item).strip() for item in value if str(item).strip()]


def _normalize_score(value: Any) -> int:
    try:
        score = float(value)
    except (TypeError, ValueError):
        score = 0
    if 0 <= score <= 1:
        score *= 100
    return int(max(0, min(100, round(score))))


def _parse_analysis(parsed: dict[str, Any]) -> ResumeAnalysis | None:
    source = parsed.get("analysis") if isinstance(parsed.get("analysis"), dict) else parsed
    if not isinstance(source, dict):
        return None
    return ResumeAnalysis(
        match_score=_normalize_score(source.get("match_score")),
        requirements=_string_list(source.get("requirements")),
        overlap=_string_list(source.get("overlap")),
        gaps=_string_list(source.get("gaps")),
        missing_keywords=_string_list(source.get("missing_keywords")),
        suggestions=_string_list(source.get("suggestions")),
    )


def _experience_lookup(resume: dict[str, Any]) -> dict[tuple[str | None, int], dict[str, Any]]:
    lookup: dict[tuple[str | None, int], dict[str, Any]] = {}
    for item in resume.get("experience") or []:
        if not isinstance(item, dict):
            continue
        exp_id = str(item.get("id")) if item.get("id") else None
        role_title = str(item.get("jobTitle")) if item.get("jobTitle") else None
        bullets = item.get("bullets") or []
        for index, bullet in enumerate(bullets):
            if isinstance(bullet, dict):
                lookup[(exp_id, index)] = {
                    "experience_id": exp_id,
                    "role_title": role_title,
                    "text": str(bullet.get("text") or ""),
                }
                lookup[(None, index)] = lookup[(exp_id, index)]
    return lookup


def _parse_tailor_suggestions(
    parsed: dict[str, Any],
    resume: dict[str, Any],
    validation_issues: list[str] | None = None,
) -> TailorSuggestions | None:
    source = parsed.get("tailor_suggestions")
    if not isinstance(source, dict):
        return None

    summary_suggestions = []
    current_summary = str(resume.get("summary") or "")
    for item in source.get("summary") or []:
        if not isinstance(item, dict):
            continue
        suggested = str(item.get("suggested_text") or "").strip()
        reason = str(item.get("reason") or "").strip()
        if suggested and reason:
            suggested, reason, unsupported = _source_bound_rewrite(current_summary, suggested, reason)
            if unsupported and validation_issues is not None:
                validation_issues.append(f"summary added unsupported terms: {', '.join(unsupported[:8])}")
            summary_suggestions.append(
                {
                    "current_text": current_summary,
                    "suggested_text": suggested,
                    "reason": reason,
                }
            )

    lookup = _experience_lookup(resume)
    bullet_suggestions: list[ExperienceBulletSuggestion] = []
    for item in source.get("experience_bullets") or []:
        if not isinstance(item, dict):
            continue
        try:
            bullet_index = int(item.get("bullet_index"))
        except (TypeError, ValueError):
            continue
        exp_id = str(item.get("experience_id")) if item.get("experience_id") else None
        matched = lookup.get((exp_id, bullet_index)) or lookup.get((None, bullet_index))
        if not matched:
            continue
        suggested = str(item.get("suggested_text") or "").strip()
        reason = str(item.get("reason") or "").strip()
        if not suggested or not reason:
            continue
        current_text = matched["text"]
        suggested, reason, unsupported = _source_bound_rewrite(
            str(current_text),
            suggested,
            reason,
            max_new_terms=MAX_BULLET_REWRITE_NEW_TERMS,
        )
        if unsupported and validation_issues is not None:
            validation_issues.append(
                f"bullet {bullet_index} added unsupported terms: {', '.join(unsupported[:8])}"
            )
        bullet_suggestions.append(
            ExperienceBulletSuggestion(
                experience_id=matched["experience_id"],
                role_title=matched["role_title"],
                bullet_index=bullet_index,
                current_text=str(current_text),
                suggested_text=suggested,
                reason=reason,
            )
        )

    return TailorSuggestions(summary=summary_suggestions, experience_bullets=bullet_suggestions)


def get_intent_options(intent: str) -> dict[str, Any]:
    intent = intent.lower()
    if intent == "conversation":
        try:
            num_ctx = int(os.getenv("RESUME_CONVERSATION_NUM_CTX", os.getenv("RESUME_ASK_NUM_CTX", "2048")))
        except ValueError:
            num_ctx = 2048
        try:
            num_predict = int(os.getenv("RESUME_CONVERSATION_NUM_PREDICT", os.getenv("RESUME_ASK_NUM_PREDICT", "450")))
        except ValueError:
            num_predict = 450
        try:
            temperature = float(os.getenv("RESUME_CONVERSATION_TEMPERATURE", os.getenv("RESUME_ASK_TEMPERATURE", "0.35")))
        except ValueError:
            temperature = 0.35
        try:
            top_k = int(os.getenv("RESUME_CONVERSATION_TOP_K", os.getenv("RESUME_ASK_TOP_K", "30")))
        except ValueError:
            top_k = 30
        return {
            "temperature": temperature,
            "num_predict": num_predict,
            "num_ctx": num_ctx,
            "top_k": top_k,
        }
    elif intent == "tailor_suggestions":
        try:
            num_ctx = int(os.getenv("RESUME_TAILOR_NUM_CTX", "2048"))
        except ValueError:
            num_ctx = 2048
        try:
            num_predict = int(os.getenv("RESUME_TAILOR_NUM_PREDICT", "650"))
        except ValueError:
            num_predict = 650
        try:
            temperature = float(os.getenv("RESUME_TAILOR_TEMPERATURE", "0.25"))
        except ValueError:
            temperature = 0.25
        try:
            top_k = int(os.getenv("RESUME_TAILOR_TOP_K", "30"))
        except ValueError:
            top_k = 30
        return {
            "temperature": temperature,
            "num_predict": num_predict,
            "num_ctx": num_ctx,
            "top_k": top_k,
        }
    else: # analysis
        try:
            num_ctx = int(os.getenv("RESUME_ANALYZE_NUM_CTX", "4096"))
        except ValueError:
            num_ctx = 4096
        try:
            num_predict = int(os.getenv("RESUME_ANALYZE_NUM_PREDICT", "1000"))
        except ValueError:
            num_predict = 1000
        try:
            temperature = float(os.getenv("RESUME_ANALYZE_TEMPERATURE", "0.2"))
        except ValueError:
            temperature = 0.2
        try:
            top_k = int(os.getenv("RESUME_ANALYZE_TOP_K", "30"))
        except ValueError:
            top_k = 30
        return {
            "temperature": temperature,
            "num_predict": num_predict,
            "num_ctx": num_ctx,
            "top_k": top_k,
        }


def get_mode_options(mode: str) -> dict[str, Any]:
    legacy_map = {
        "ask": "conversation",
        "tailor": "tailor_suggestions",
        "analyze": "analysis",
    }
    return get_intent_options(legacy_map.get(mode.lower(), mode))


def get_rewrite_options() -> dict[str, Any]:
    try:
        num_ctx = int(os.getenv("RESUME_REWRITE_NUM_CTX", "1536"))
    except ValueError:
        num_ctx = 1536
    try:
        num_predict = int(os.getenv("RESUME_REWRITE_NUM_PREDICT", "450"))
    except ValueError:
        num_predict = 450
    try:
        temperature = float(os.getenv("RESUME_REWRITE_TEMPERATURE", "0.05"))
    except ValueError:
        temperature = 0.05
    try:
        top_k = int(os.getenv("RESUME_REWRITE_TOP_K", "30"))
    except ValueError:
        top_k = 30
    return {
        "temperature": temperature,
        "num_predict": num_predict,
        "num_ctx": num_ctx,
        "top_k": top_k,
    }


def _rewrite_system_prompt() -> str:
    return (
        "You rewrite only the resume text explicitly provided in the user prompt. "
        "Do not use or request the full resume. Do not invent employers, degrees, dates, skills, tools, metrics, scope, or outcomes. "
        "Do not change the candidate's role, specialty, domain, seniority, or technical focus. "
        "A rewrite should improve phrasing without becoming a new profile or a more impressive version of unsupported facts. "
        "You may remove weak wording, reorder facts, use safe synonyms, and start bullets with a stronger action verb. "
        "Do not add factual claims such as new tools, metrics, production/customer/team scope, reliability, scale, ownership, or business impact unless those facts are already present in the source text. "
        "If the source text is too thin to improve truthfully, return it unchanged. "
        "Return a single JSON object only. No Markdown."
    )


def _build_section_rewrite_prompt(request: ResumeRewriteSectionRequest) -> str:
    guidance = _cap_text(request.guidance, MAX_REWRITE_GUIDANCE_CHARS) or (
        "Improve clarity, specificity, resume impact, and professional tone while preserving truthfulness."
    )

    if request.target == "summary":
        schema = {
            "assistant_message": "One short sentence explaining the rewrite.",
            "tailor_suggestions": {
                "summary": [
                    {
                        "current_text": "Exact current summary text.",
                        "suggested_text": "Suggested replacement summary.",
                        "reason": "Why this is better.",
                    }
                ],
                "experience_bullets": [],
            },
        }
        summary_text = _cap_text(request.summary_text, MAX_REWRITE_TEXT_CHARS)
        return (
            "Task: Rewrite the professional summary only.\n"
            f"Guidance: {guidance}\n\n"
            f"Current summary:\n{summary_text}\n\n"
            "Hard rules:\n"
            "- Preserve the same role/domain facts from the current summary.\n"
            "- Do not introduce a new specialty, industry, tool, metric, title, or outcome.\n"
            "- Safe synonyms and cleaner phrasing are allowed when they do not change the factual meaning.\n"
            "- Do not add impressive but unsupported descriptors such as scalable, enterprise, production, reliable, cross-functional, strategic, or results-driven unless they already appear in the current summary.\n"
            "- If a fact is not present in the current summary, do not add it.\n"
            "- If you cannot improve it without adding facts, return the current text unchanged.\n\n"
            "Return only JSON matching this shape:\n"
            f"{json.dumps(schema, indent=2)}"
        )

    schema = {
        "assistant_message": "One short sentence explaining the rewrite.",
        "tailor_suggestions": {
            "summary": [],
            "experience_bullets": [
                {
                    "experience_id": request.experience_id,
                    "role_title": None,
                    "bullet_index": 0,
                    "current_text": "Exact current bullet text.",
                    "suggested_text": "Suggested replacement bullet.",
                    "reason": "Why this is better.",
                }
            ],
        },
    }
    bullet_lines = "\n".join(
        f"[{item.index}] {_cap_text(item.text, MAX_REWRITE_TEXT_CHARS)}"
        for item in request.bullets
        if item.text.strip()
    )
    return (
        "Task: Rewrite only the provided work-experience bullets. Treat each bullet as an independent source of facts.\n"
        f"Experience id: {request.experience_id or 'None'}\n"
        f"Guidance: {guidance}\n\n"
        f"Current bullets:\n{bullet_lines}\n\n"
        "Hard rules:\n"
        "- Preserve the same facts from each current bullet and do not borrow facts from other bullets.\n"
        "- Do not infer details from role title, company, seniority, industry, or adjacent resume context.\n"
        "- Do not introduce a new specialty, industry, tool, metric, title, or outcome.\n"
        "- If a fact is not present in a bullet, do not add it to that bullet.\n"
        "- Safe synonyms, grammar fixes, filler removal, and concise phrasing improvements are allowed when they do not change the factual meaning.\n"
        "- The replacement should usually be similar length or shorter than the original bullet.\n"
        "- Do not add implied scope such as teams, customers, production, enterprise, workflows, revenue, reliability, scale, or leadership unless that exact idea is already in the bullet.\n"
        "- Prefer a smaller truthful rewrite over a stronger-sounding rewrite.\n"
        "- If a bullet cannot be improved without adding facts, return it unchanged.\n\n"
        "Bullet style guidance:\n"
        "- Start each improved bullet with a clear action verb when the source text supports it.\n"
        "- Prefer an XYZ-style shape only when the bullet already contains X, Y, and Z: achieved X, measured by Y, by doing Z.\n"
        "- Do not invent the Y. If no metric or measured result is present, use action + scope + truthful outcome instead.\n"
        "- Avoid repeating the same content or phrasing unless it is required to preserve a fact.\n"
        "- Avoid excessive buzzwords and generic filler such as strategic, results-driven, dynamic, innovative, world-class, proven, and cutting-edge.\n\n"
        "Grounding examples:\n"
        "- Source: Responsible for building APIs.\n"
        "- Good: Built APIs.\n"
        "- Bad: Built reliable production APIs for customer workflows.\n"
        "- Source: Created reports.\n"
        "- Good: Created reports.\n"
        "- Bad: Created insightful reports that improved decision-making.\n\n"
        "Return one experience_bullets item for each provided bullet, even if the best replacement is the same text. "
        "Preserve the exact bullet_index values shown above. Do not rewrite role title, company, dates, education, skills, or contact details.\n"
        "Return only JSON matching this shape:\n"
        f"{json.dumps(schema, indent=2)}"
    )


def _minimal_rewrite_resume(request: ResumeRewriteSectionRequest) -> dict[str, Any]:
    if request.target == "summary":
        return {
            "summary": _cap_text(request.summary_text, MAX_REWRITE_TEXT_CHARS),
            "experience": [],
        }

    return {
        "summary": "",
        "experience": [
            {
                "id": request.experience_id,
                "jobTitle": request.role_title,
                "company": request.company,
                "bullets": [
                    {
                        "id": item.id,
                        "text": _cap_text(item.text, MAX_REWRITE_TEXT_CHARS),
                    }
                    for item in request.bullets
                    if item.text.strip()
                ],
            }
        ],
    }


async def generate_resume_rewrite_suggestion(request: ResumeRewriteSectionRequest) -> ResumeRewriteSectionResponse:
    if request.target == "summary" and not (request.summary_text or "").strip():
        return ResumeRewriteSectionResponse(
            assistant_message="Add summary text before requesting a rewrite.",
            tailor_suggestions=TailorSuggestions(),
        )
    if request.target == "experience" and not [item for item in request.bullets if item.text.strip()]:
        return ResumeRewriteSectionResponse(
            assistant_message="Add at least one work-experience bullet before requesting a rewrite.",
            tailor_suggestions=TailorSuggestions(),
        )

    options = get_rewrite_options()
    provider = get_resume_llm_provider()
    response, validation_issues = await _generate_resume_rewrite_once(provider, request, options)
    if validation_issues:
        retry_response, _ = await _generate_resume_rewrite_once(provider, _rewrite_retry_request(request, validation_issues), options)
        if _has_rewrite_suggestions(retry_response):
            return retry_response
    return response


async def _generate_resume_rewrite_once(provider: Any, request: ResumeRewriteSectionRequest, options: dict[str, Any]) -> tuple[ResumeRewriteSectionResponse, list[str]]:
    llm_response = await provider.generate(
        system=_rewrite_system_prompt(),
        messages=[LLMMessage(role="user", content=_build_section_rewrite_prompt(request))],
        temperature=options["temperature"],
        max_tokens=options["num_predict"],
        options=options,
    )
    validation_issues: list[str] = []
    response = _rewrite_response_from_model_text(request, llm_response.text, validation_issues=validation_issues)
    return response, validation_issues


def _has_rewrite_suggestions(response: ResumeRewriteSectionResponse) -> bool:
    return bool(response.tailor_suggestions.summary or response.tailor_suggestions.experience_bullets)


def _rewrite_response_from_model_text(
    request: ResumeRewriteSectionRequest,
    text: str,
    validation_issues: list[str] | None = None,
) -> ResumeRewriteSectionResponse:
    parsed = _extract_json_object(text)
    if not parsed:
        return ResumeRewriteSectionResponse(
            assistant_message=UNSTRUCTURED_REWRITE_MESSAGE,
            tailor_suggestions=TailorSuggestions(),
        )

    suggestions = _parse_tailor_suggestions(
        parsed,
        _minimal_rewrite_resume(request),
        validation_issues=validation_issues,
    ) or TailorSuggestions()

    if request.target == "summary":
        suggestions.experience_bullets = []
    else:
        suggestions.summary = []

    return ResumeRewriteSectionResponse(
        assistant_message=str(parsed.get("assistant_message") or "").strip() or text,
        tailor_suggestions=suggestions,
    )


async def stream_resume_rewrite_suggestion(request: ResumeRewriteSectionRequest) -> AsyncIterator[str]:
    if request.target == "summary" and not (request.summary_text or "").strip():
        yield _rewrite_stream_event(
            ResumeRewriteStreamEvent(
                event="error",
                target=request.target,
                message="Add summary text before requesting a rewrite.",
            )
        )
        yield _rewrite_stream_event(ResumeRewriteStreamEvent(event="done", target=request.target))
        return

    if request.target == "experience" and not [item for item in request.bullets if item.text.strip()]:
        yield _rewrite_stream_event(
            ResumeRewriteStreamEvent(
                event="error",
                target=request.target,
                message="Add at least one work-experience bullet before requesting a rewrite.",
            )
        )
        yield _rewrite_stream_event(ResumeRewriteStreamEvent(event="done", target=request.target))
        return

    options = get_rewrite_options()
    provider = get_resume_llm_provider()
    last_drafts: dict[int | None, str] = {}
    result: dict[str, Any] = {}

    async def stream_attempt(attempt_request: ResumeRewriteSectionRequest) -> AsyncIterator[str]:
        buffer = ""
        async for chunk in provider.stream(
            system=_rewrite_system_prompt(),
            messages=[LLMMessage(role="user", content=_build_section_rewrite_prompt(attempt_request))],
            temperature=options["temperature"],
            max_tokens=options["num_predict"],
            options=options,
        ):
            buffer += chunk
            for bullet_index, text in _rewrite_draft_values(attempt_request, buffer):
                if not text or last_drafts.get(bullet_index) == text:
                    continue
                last_drafts[bullet_index] = text
                yield _rewrite_stream_event(
                    ResumeRewriteStreamEvent(
                        event="delta",
                        target=attempt_request.target,
                        bullet_index=bullet_index,
                        text=text,
                    )
                )

        validation_issues: list[str] = []
        result["response"] = _rewrite_response_from_model_text(
            attempt_request,
            buffer,
            validation_issues=validation_issues,
        )
        result["validation_issues"] = validation_issues

    async for event in stream_attempt(request):
        yield event

    response = result.get("response")
    validation_issues = result.get("validation_issues") or []
    if validation_issues:
        retry_request = _rewrite_retry_request(request, validation_issues)
        async for event in stream_attempt(retry_request):
            yield event
        retry_response = result.get("response")
        if isinstance(retry_response, ResumeRewriteSectionResponse) and _has_rewrite_suggestions(retry_response):
            response = retry_response

    if not isinstance(response, ResumeRewriteSectionResponse):
        response = ResumeRewriteSectionResponse(
            assistant_message="Failed to parse resume rewrite response.",
            tailor_suggestions=TailorSuggestions(),
        )

    yield _rewrite_stream_event(
        ResumeRewriteStreamEvent(
            event="structured",
            target=request.target,
            assistant_message=response.assistant_message,
            tailor_suggestions=response.tailor_suggestions,
        )
    )
    yield _rewrite_stream_event(ResumeRewriteStreamEvent(event="done", target=request.target))


async def generate_resume_chat_response(request: ResumeChatRequest) -> ResumeChatResponse:
    message = _cap_text(request.message, MAX_MESSAGE_CHARS)
    context = _cap_text(request.context, MAX_CONTEXT_CHARS)
    intent = infer_resume_chat_intent(message, context)
    include_resume_context = not (intent == "conversation" and is_casual_conversation(message, context))
    resume = _sanitize_resume_data(request.resume_data, intent)
    system = build_system_prompt(intent)
    user_prompt = build_user_prompt(intent, message, resume, context, include_resume_context=include_resume_context)
    messages = _history_to_messages(request)
    messages[-1] = LLMMessage(role="user", content=user_prompt)

    options = get_intent_options(intent)
    provider = get_resume_llm_provider()
    llm_response = await provider.generate(
        system=system,
        messages=messages,
        temperature=options["temperature"],
        max_tokens=options["num_predict"],
        options=options,
    )

    if intent == "conversation":
        return ResumeChatResponse(intent=intent, assistant_message=llm_response.text)

    parsed = _extract_json_object(llm_response.text)
    if not parsed:
        return ResumeChatResponse(intent=intent, assistant_message=llm_response.text)

    assistant_message = str(parsed.get("assistant_message") or "").strip() or llm_response.text
    if intent == "tailor_suggestions":
        return ResumeChatResponse(
            intent=intent,
            assistant_message=assistant_message,
            tailor_suggestions=_parse_tailor_suggestions(parsed, resume),
        )

    return ResumeChatResponse(
        intent=intent,
        assistant_message=assistant_message,
        analysis=_parse_analysis(parsed),
    )


def _stream_event(event: ResumeChatStreamEvent) -> str:
    return event.model_dump_json(exclude_none=True) + "\n"


def _rewrite_stream_event(event: ResumeRewriteStreamEvent) -> str:
    return event.model_dump_json(exclude_none=True) + "\n"


async def stream_resume_chat_response(request: ResumeChatRequest) -> AsyncIterator[str]:
    message = _cap_text(request.message, MAX_MESSAGE_CHARS)
    context = _cap_text(request.context, MAX_CONTEXT_CHARS)
    intent = infer_resume_chat_intent(message, context)
    include_resume_context = not (intent == "conversation" and is_casual_conversation(message, context))
    yield _stream_event(ResumeChatStreamEvent(event="intent", intent=intent))

    if intent != "conversation":
        response = await generate_resume_chat_response(request)
        if response.assistant_message:
            yield _stream_event(ResumeChatStreamEvent(event="delta", text=response.assistant_message))
        if response.analysis or response.tailor_suggestions:
            yield _stream_event(
                ResumeChatStreamEvent(
                    event="structured",
                    intent=response.intent,
                    analysis=response.analysis,
                    tailor_suggestions=response.tailor_suggestions,
                )
            )
        yield _stream_event(ResumeChatStreamEvent(event="done", intent=response.intent))
        return

    resume = _sanitize_resume_data(request.resume_data, intent)
    system = build_system_prompt(intent)
    user_prompt = build_user_prompt(intent, message, resume, context, include_resume_context=include_resume_context)
    messages = _history_to_messages(request)
    messages[-1] = LLMMessage(role="user", content=user_prompt)

    options = get_intent_options(intent)
    provider = get_resume_llm_provider()
    async for chunk in provider.stream(
        system=system,
        messages=messages,
        temperature=options["temperature"],
        max_tokens=options["num_predict"],
        options=options,
    ):
        yield _stream_event(ResumeChatStreamEvent(event="delta", text=chunk))
    yield _stream_event(ResumeChatStreamEvent(event="done", intent=intent))
