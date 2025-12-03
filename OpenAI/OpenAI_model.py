import os
import io
import json
import time
from openai import OpenAI
from typing import Dict, Any
from dotenv import load_dotenv
from PyPDF2 import PdfReader
from common.logger import get_logger

load_dotenv()

logging = get_logger()
client = OpenAI() 
#openai.api_key = os.getenv("OPENAI_API_KEY")


def call_openai_chat(model: str, messages: list, max_tokens: int = 512, temperature: float = 0.0) -> Dict[str, Any]:
    """Call OpenAI Chat Completions with simple retry/backoff and return parsed text + raw response."""
    last_error: Exception | None = None

    #for attempt in range(3):
    try:
            resp = client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
            )
            text = resp.choices[0].message.content
            return {"raw": text, "response": resp}
    except Exception as e:
            last_error = e
            logging.error(
                f"OpenAI call failed on attempt: {e}",
                exc_info=True,
            )
            #time.sleep(2 ** attempt)   add back up {attempt + 1}

    raise RuntimeError(f"OpenAI calls failed after retries: {last_error}")


def classify_email_stage(email_text: str, model: str | None = None) -> Dict[str, Any]:
    """Use OpenAI to classify an email into stage and provide scores.

    Returns dict matching classification model contract used by `classification.class_model.classify_email_stage`:
    {"stage": str, "score": float, "second_stage": str|None, "second_score": float|0, "stage_scores": {stage: score}}
    """
    model_name = model or os.getenv("OPENAI_CLASSIFIER_MODEL", "gpt-3.5-turbo")

    system = {
        "role": "system",
        "content": (
            "You are a helpful assistant that reads an email and returns a JSON object describing which job-stage it belongs to."
        ),
    }

    user = {
        "role": "user",
        "content": (
            "Read the following email and return ONLY a JSON object with the exact keys:"
            " stage (one of: applied, interview, offer, accepted, rejected, unknown),"
            " score (float between 0 and 1),"
            " second_stage (string or null),"
            " second_score (float),"
            " stage_scores (object mapping stages to float scores).",
            "\n\nEmail:\n" + email_text
        ),
    }

    out = call_openai_chat(model_name, [system, user], max_tokens=512, temperature=0.0)
    raw = out.get("raw", "")

    # Attempt to extract JSON from raw text
    try:
        # Some models may wrap JSON in backticks or markdown; find first brace
        start = raw.find("{")
        if start != -1:
            json_str = raw[start:]
        else:
            json_str = raw
        parsed = json.loads(json_str)
    except Exception:
        # fallback: try to parse the last line
        try:
            parsed = json.loads(raw.strip())
        except Exception:
            # On parse failure, return unknown with low confidence
            return {
                "stage": "unknown",
                "score": 0.0,
                "second_stage": None,
                "second_score": 0.0,
                "stage_scores": {},
                "raw": raw,
            }

    # normalize output
    stage = parsed.get("stage") or parsed.get("label") or "unknown"
    score = float(parsed.get("score") or parsed.get("confidence") or 0.0)
    second_stage = parsed.get("second_stage")
    second_score = float(parsed.get("second_score") or 0.0)
    stage_scores = parsed.get("stage_scores") or {}

    # ensure floats in stage_scores
    try:
        stage_scores = {k: float(v) for k, v in stage_scores.items()}
    except Exception:
        stage_scores = {}

    return {
        "stage": stage,
        "score": score,
        "second_stage": second_stage,
        "second_score": second_score,
        "stage_scores": stage_scores,
        "raw": raw,
    }


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text from a PDF file bytes using PyPDF2."""
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        texts = []
        for page in reader.pages:
            try:
                texts.append(page.extract_text() or "")
            except Exception:
                continue
        return "\n\n".join(texts)
    except Exception:
        return ""



def evaluate_resume_pdf(file_bytes: bytes, model: str | None = None) -> Dict[str, Any]:
    """Evaluate a resume PDF and return structured feedback.

    Returns:
    {
      "score": 0-100,
      "strengths": [str, ...],
      "weaknesses": [str, ...],
      "suggestions": str,
      "raw": str
    }
    """
    text = extract_text_from_pdf(file_bytes)

    if not text:
        return {
            "score": 0,
            "strengths": [],
            "weaknesses": ["Could not extract text from PDF"],
            "suggestions": "Upload a searchable PDF or a plain-text resume.",
            "raw": "",
        }

    model_name = model or os.getenv("OPENAI_RESUME_MODEL", "gpt-4.1-mini")

    system = {
        "role": "system",
        "content": "You are a resume reviewer. Provide concise, actionable feedback."
    }

    user = {
        "role": "user",
        "content": (
            "Review the resume content below and respond ONLY with a single JSON object. "
            "Do not include explanations or code fences.\n\n"
            "Schema:\n"
            "{\n"
            '  \"score\": <number between 0 and 100>,\n'
            '  \"strengths\": [<string>, ...],\n'
            '  \"weaknesses\": [<string>, ...],\n'
            '  \"suggestions\": <string>\n'
            "}\n\n"
            "Resume:\n" + text[:4000]
        ),
    }

    out = call_openai_chat(model_name, [system, user], max_tokens=800, temperature=0.0)
    raw = out.get("raw", "") or ""

    # ---- JSON extraction / parsing ----
    try:
        # Isolate from first '{' to last '}'
        start = raw.index("{")
        end = raw.rfind("}")
        json_str = raw[start:end + 1]

        # Strip any leftover code fences
        json_str = json_str.replace("```json", "").replace("```", "").strip()

        parsed = json.loads(json_str)
    except Exception:
        # Fallback: show raw in suggestions so UI still displays something
        return {
            "score": 0,
            "strengths": [],
            "weaknesses": [],
            "suggestions": raw or "Model returned an unexpected format.",
            "raw": raw,
        }

    # ---- Normalize fields ----
    # Score: accept 0–1 *or* 0–100; convert to int 0–100
    score_raw = parsed.get("score", 0)
    try:
        score_val = float(score_raw)
    except (TypeError, ValueError):
        score_val = 0.0

    if 0.0 <= score_val <= 1.0:
        score_val *= 100.0

    score = int(round(max(0.0, min(100.0, score_val))))

    strengths = parsed.get("strengths") or []
    if isinstance(strengths, str):
        strengths = [strengths]
    strengths = [str(s).strip() for s in strengths if str(s).strip()]

    weaknesses = parsed.get("weaknesses") or []
    if isinstance(weaknesses, str):
        weaknesses = [weaknesses]
    weaknesses = [str(w).strip() for w in weaknesses if str(w).strip()]

    suggestions = str(parsed.get("suggestions", "")).strip()

    return {
        "score": score,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "suggestions": suggestions,
        "raw": raw,
    }
