import json
import os
import re
from typing import Any

import requests


EMAIL_LLM_DEFAULT_MODEL = "qwen2.5:1.5b"
SUPPORTED_CATEGORIES = {
    "APPLICATION_RECEIVED",
    "APPLICATION_UPDATE",
    "INTERVIEW",
    "ASSESSMENT",
    "OFFER",
    "ACCEPTED",
    "REJECTION",
    "RECRUITER_OUTREACH",
    "NETWORKING",
    "FOLLOW_UP",
    "NOT_JOB_RELATED",
    "UNKNOWN",
}
CATEGORY_ALIASES = {
    "APPLICATION_REJECTION": "REJECTION",
    "APPLICATION_REJECTED": "REJECTION",
    "APPLICATION_ACCEPTED": "ACCEPTED",
    "APPLICATION_SUBMITTED": "APPLICATION_RECEIVED",
    "JOB_OFFER": "OFFER",
    "INTERVIEW_REQUEST": "INTERVIEW",
}


class EmailLLMClassifierError(RuntimeError):
    pass


class EmailLLMTransientError(EmailLLMClassifierError):
    pass


def _normalize_category(value: Any) -> str | None:
    category = str(value or "").strip().upper()
    if category in {"", "NONE", "NULL"}:
        return None
    return CATEGORY_ALIASES.get(category, category)


def _timeout_seconds() -> float:
    try:
        return max(1.0, float(os.getenv("EMAIL_LLM_TIMEOUT_SECONDS", "45")))
    except ValueError:
        return 45.0


def _ollama_base_url() -> str:
    return os.getenv("OLLAMA_BASE_URL", "http://local_llm:11434").rstrip("/")


def _ollama_model() -> str:
    return os.getenv("EMAIL_LLM_MODEL") or os.getenv("RESUME_LLM_MODEL", EMAIL_LLM_DEFAULT_MODEL)


def _extract_json_object(text: str) -> dict[str, Any]:
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, flags=re.S)
        if not match:
            raise EmailLLMTransientError("LLM response did not contain JSON.")
        try:
            parsed = json.loads(match.group(0))
        except json.JSONDecodeError as exc:
            raise EmailLLMTransientError("LLM response JSON was malformed.") from exc

    if not isinstance(parsed, dict):
        raise EmailLLMTransientError("LLM response JSON must be an object.")
    return parsed


def parse_llm_classification_response(text: str) -> dict:
    parsed = _extract_json_object(text)
    category = _normalize_category(parsed.get("category"))
    secondary_category = _normalize_category(parsed.get("secondary_category"))

    if category not in SUPPORTED_CATEGORIES:
        raise EmailLLMClassifierError(f"Unsupported LLM category '{category}'.")
    if secondary_category is not None and secondary_category not in SUPPORTED_CATEGORIES:
        raise EmailLLMClassifierError(
            f"Unsupported LLM secondary category '{secondary_category}'."
        )

    try:
        confidence = float(parsed.get("confidence", 0.0))
        secondary_confidence = float(parsed.get("secondary_confidence", 0.0) or 0.0)
    except (TypeError, ValueError) as exc:
        raise EmailLLMClassifierError("LLM confidence values must be numeric.") from exc

    confidence = max(0.0, min(confidence, 1.0))
    secondary_confidence = max(0.0, min(secondary_confidence, 1.0))

    return {
        "category": category,
        "confidence": confidence,
        "secondary_category": secondary_category,
        "secondary_confidence": secondary_confidence,
        "reason": str(parsed.get("reason") or "llm_classification").strip()[:80],
        "raw": parsed,
    }


def classify_email_with_ollama(email_text: str) -> dict:
    system = (
        "Classify a Gmail message for a job application tracker. "
        "Return strict JSON only. Use category values only from: "
        "APPLICATION_RECEIVED, APPLICATION_UPDATE, INTERVIEW, ASSESSMENT, OFFER, "
        "ACCEPTED, REJECTION, RECRUITER_OUTREACH, NETWORKING, FOLLOW_UP, "
        "NOT_JOB_RELATED, UNKNOWN. "
        "Schema: {\"category\": string, \"confidence\": number, "
        "\"secondary_category\": string|null, \"secondary_confidence\": number, "
        "\"reason\": string}. Do not include email text in the reason."
    )
    payload = {
        "model": _ollama_model(),
        "stream": False,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": email_text[:6000]},
        ],
        "options": {
            "temperature": 0,
            "num_predict": int(os.getenv("EMAIL_LLM_NUM_PREDICT", "180")),
        },
    }
    keep_alive = os.getenv("EMAIL_LLM_KEEP_ALIVE")
    if keep_alive:
        payload["keep_alive"] = keep_alive

    try:
        response = requests.post(
            f"{_ollama_base_url()}/api/chat",
            json=payload,
            timeout=_timeout_seconds(),
        )
        response.raise_for_status()
        raw = response.json()
    except requests.RequestException as exc:
        raise EmailLLMTransientError("Ollama classification request failed.") from exc
    except ValueError as exc:
        raise EmailLLMTransientError("Ollama returned invalid JSON.") from exc

    content = str((raw.get("message") or {}).get("content") or "").strip()
    if not content:
        raise EmailLLMClassifierError("Ollama returned an empty classification.")

    parsed = parse_llm_classification_response(content)
    parsed["provider"] = "ollama"
    parsed["model"] = _ollama_model()
    return parsed
