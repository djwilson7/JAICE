import os
import io
import json
import time
from openai import OpenAI
from typing import Dict, Any, List, Optional
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
      "checklist": [str, ...],
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
            "checklist": [],
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
            '  \"suggestions\": <string>,\n'
            '  \"checklist\": [<string>, ...] should contain 3–7 short, actionable tasks the candidate can do next.\n'
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
            "checklist": [],
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

    checklist = parsed.get("checklist") or []
    if isinstance(checklist, str):
        checklist = [checklist]
    checklist = [str(c).strip() for c in checklist if str(c).strip()]

    return {
        "score": score,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "suggestions": suggestions,
        "checklist": checklist,
        "raw": raw,
    }


# --------------------------------------------------------------------
# NEW: Helpers for the resume builder (per-field + structured resume)
# --------------------------------------------------------------------

def improve_resume_bullet(
    bullet_text: str,
    job_title: Optional[str] = None,
    company: Optional[str] = None,
    model: Optional[str] = None,
) -> Dict[str, str]:
    """
    Improve a single resume bullet point.

    Returns:
    { "improved_bullet": "<rewritten bullet>" }
    """
    model_name = model or os.getenv("OPENAI_RESUME_MODEL", "gpt-4.1-mini")

    context_parts = []
    if job_title:
        context_parts.append(f"Job title: {job_title}")
    if company:
        context_parts.append(f"Company: {company}")

    context_str = "\n".join(context_parts) if context_parts else "No extra context."

    system = {
        "role": "system",
        "content": (
            "You rewrite resume bullets into concise, impact-focused statements, "
            "using strong action verbs and numbers/metrics when possible. "
            "Return only a single improved bullet, no extra commentary."
        ),
    }

    user = {
        "role": "user",
        "content": (
            f"{context_str}\n\n"
            f"Original bullet:\n{bullet_text}\n\n"
            "Rewrite this as a stronger single resume bullet."
        ),
    }

    out = call_openai_chat(model_name, [system, user], max_tokens=120, temperature=0.3)
    improved = (out.get("raw") or "").strip()

    return {"improved_bullet": improved}


def improve_resume_summary(
    summary_text: str,
    target_role: Optional[str] = None,
    model: Optional[str] = None,
) -> Dict[str, str]:
    """
    Improve the professional summary / objective section.

    Returns:
    { "improved_summary": "<rewritten summary>" }
    """
    model_name = model or os.getenv("OPENAI_RESUME_MODEL", "gpt-4.1-mini")

    role_line = f"Target role: {target_role}" if target_role else "Target role: not specified."

    system = {
        "role": "system",
        "content": (
            "You are an expert resume writer. You rewrite professional summaries to be "
            "2–4 concise sentences highlighting experience, skills, and value. "
            "Return only the improved summary text, no headers or extra commentary."
        ),
    }

    user = {
        "role": "user",
        "content": (
            f"{role_line}\n\n"
            f"Current summary:\n{summary_text}\n\n"
            "Rewrite this summary to be more impactful and tailored to the target role."
        ),
    }

    out = call_openai_chat(model_name, [system, user], max_tokens=200, temperature=0.3)
    improved = (out.get("raw") or "").strip()

    return {"improved_summary": improved}


def _structured_resume_to_text(resume: Dict[str, Any]) -> str:
    """
    Helper: turn structured resume data (from your form) into a plain-text
    representation that the model can read.
    """
    lines: List[str] = []

    full_name = resume.get("fullName") or resume.get("name") or ""
    if full_name:
        lines.append(full_name)

    contact_parts = []
    for key in ("email", "phone", "location", "website", "linkedin"):
        if resume.get(key):
            contact_parts.append(str(resume[key]))
    if contact_parts:
        lines.append("Contact: " + " | ".join(contact_parts))

    if resume.get("summary"):
        lines.append("\nSummary:")
        lines.append(str(resume["summary"]))

    # Experience
    experiences = resume.get("experience", [])
    if experiences:
        lines.append("\nExperience:")
        for exp in experiences:
            title = exp.get("jobTitle", "")
            company = exp.get("company", "")
            location = exp.get("location", "")
            dates = " - ".join(
                [d for d in [exp.get("startDate", ""), exp.get("endDate", "")] if d]
            )

            header_parts = [p for p in [title, company, location, dates] if p]
            if header_parts:
                lines.append(" • " + " | ".join(header_parts))

            bullets = exp.get("bullets", [])
            for b in bullets:
                text = b.get("text") if isinstance(b, dict) else str(b)
                if text:
                    lines.append(f"    - {text}")

    # Education
    education = resume.get("education", [])
    if education:
        lines.append("\nEducation:")
        for ed in education:
            school = ed.get("school", "")
            degree = ed.get("degree", "")
            dates = " - ".join(
                [d for d in [ed.get("startDate", ""), ed.get("endDate", "")] if d]
            )
            header_parts = [p for p in [degree, school, dates] if p]
            if header_parts:
                lines.append(" • " + " | ".join(header_parts))

    # Skills
    skills = resume.get("skills", [])
    if skills:
        skills_str = ", ".join([str(s) for s in skills if str(s).strip()])
        lines.append("\nSkills:")
        lines.append(skills_str)

    return "\n".join(lines)


def evaluate_resume_structured(
    resume_data: Dict[str, Any],
    model: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Evaluate a resume that comes from your builder (structured JSON)
    and return the same kind of feedback as evaluate_resume_pdf.
    """
    text = _structured_resume_to_text(resume_data)

    if not text.strip():
        return {
            "score": 0,
            "strengths": [],
            "weaknesses": ["Resume appears to be empty or missing key sections."],
            "suggestions": "Fill in your resume details before requesting an evaluation.",
            "checklist": [],
            "raw": "",
        }

    model_name = model or os.getenv("OPENAI_RESUME_MODEL", "gpt-4.1-mini")

    system = {
        "role": "system",
        "content": "You are a resume reviewer. Provide concise, actionable feedback.",
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
            '  \"suggestions\": <string>,\n'
            '  \"checklist\": [<string>, ...] should contain 3–7 short, actionable tasks the candidate can do next.\n'
            "}\n\n"
            "Resume:\n" + text[:4000]
        ),
    }

    out = call_openai_chat(model_name, [system, user], max_tokens=800, temperature=0.0)
    raw = out.get("raw", "") or ""

    # Same parsing/normalization logic as evaluate_resume_pdf
    try:
        start = raw.index("{")
        end = raw.rfind("}")
        json_str = raw[start:end + 1]
        json_str = json_str.replace("```json", "").replace("```", "").strip()
        parsed = json.loads(json_str)
    except Exception:
        return {
            "score": 0,
            "strengths": [],
            "weaknesses": [],
            "suggestions": raw or "Model returned an unexpected format.",
            "checklist": [],
            "raw": raw,
        }

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

    checklist = parsed.get("checklist") or []
    if isinstance(checklist, str):
        checklist = [checklist]
    checklist = [str(c).strip() for c in checklist if str(c).strip()]

    return {
        "score": score,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "suggestions": suggestions,
        "checklist": checklist,
        "raw": raw,
    }