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

    model_name = model or os.getenv("OPENAI_RESUME_MODEL", "gpt-4o-mini")

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
    model_name = model or os.getenv("OPENAI_RESUME_MODEL", "gpt-4o-mini")

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
    model_name = model or os.getenv("OPENAI_RESUME_MODEL", "gpt-4o-mini")

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

    def format_skill_categories(skills: Any) -> List[str]:
        if not isinstance(skills, list):
            return []
        if all(isinstance(skill, str) for skill in skills):
            flat_skills = [skill.strip() for skill in skills if skill and skill.strip()]
            return [", ".join(flat_skills)] if flat_skills else []

        formatted: List[str] = []
        for skill in skills:
            if not isinstance(skill, dict):
                continue
            category = str(skill.get("category") or "Skills").strip()
            items = skill.get("items", [])
            if not isinstance(items, list):
                continue
            clean_items = [str(item).strip() for item in items if str(item).strip()]
            if clean_items:
                formatted.append(f"{category}: {', '.join(clean_items)}")
        return formatted

    full_name = resume.get("fullName") or resume.get("name") or ""
    if full_name:
        lines.append(full_name)

    contact_parts = []
    hidden_contact_fields = set(resume.get("hiddenContactFields") or [])
    for key in ("location", "phone", "email", "linkedin", "website", "github"):
        if key not in hidden_contact_fields and resume.get(key):
            contact_parts.append(str(resume[key]))
    for field in resume.get("customContact", []) or []:
        if isinstance(field, dict) and field.get("value"):
            contact_parts.append(str(field["value"]))
    if contact_parts:
        lines.append("Contact: " + " | ".join(contact_parts))

    if resume.get("summary"):
        lines.append("\nProfessional Summary:")
        lines.append(str(resume["summary"]))

    # Experience
    experiences = resume.get("experience", [])
    if experiences:
        lines.append("\nWork Experience:")
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
    skills_lines = format_skill_categories(skills)
    if skills_lines:
        lines.append("\nSkills:")
        lines.extend(skills_lines)

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

    model_name = model or os.getenv("OPENAI_RESUME_MODEL", "gpt-4o-mini")

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


def analyze_job_overlap_ai(
    resume_data: Dict[str, Any],
    job_description: str,
    model: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Compare resume data with a job description. Returns a structured JSON payload:
    {
      "match_score": int,
      "position_summary": str,
      "key_requirements": [str, ...],
      "overlap_analysis": [str, ...],
      "gaps_analysis": [str, ...],
      "actionable_suggestions": [str, ...]
    }
    """
    resume_text = _structured_resume_to_text(resume_data)
    model_name = model or os.getenv("OPENAI_RESUME_MODEL", "gpt-4o-mini")

    system = {
        "role": "system",
        "content": (
            "You are an expert recruiter and career coach. Compare the resume text with "
            "the job description. Be objective and factual. "
            "Respond ONLY with a single JSON object. Do not include markdown code fences or explanations."
        )
    }

    schema_instruction = (
        "Schema:\n"
        "{\n"
        '  "match_score": <number between 0 and 100 representing overlap percent>,\n'
        '  "position_summary": "<concise 2-3 sentence overview of what the role is>",\n'
        '  "key_requirements": ["list of top 3-5 core qualifications required"],\n'
        '  "overlap_analysis": ["list of 2-4 key matches in candidate background"],\n'
        '  "gaps_analysis": ["list of 2-4 critical missing gaps in candidate background"],\n'
        '  "actionable_suggestions": ["3-5 concrete tasks candidate can do to improve odds"]\n'
        "}"
    )

    user = {
        "role": "user",
        "content": (
            f"Resume Text:\n{resume_text}\n\n"
            f"Job Description:\n{job_description}\n\n"
            f"Instructions: Provide the comparative analysis. Respond strictly matching this {schema_instruction}"
        )
    }

    out = call_openai_chat(model_name, [system, user], max_tokens=1000, temperature=0.0)
    raw = out.get("raw", "") or ""

    try:
        start = raw.index("{")
        end = raw.rfind("}")
        json_str = raw[start:end + 1]
        json_str = json_str.replace("```json", "").replace("```", "").strip()
        parsed = json.loads(json_str)
    except Exception:
        return {
            "match_score": 0,
            "position_summary": "Failed to parse analysis response from AI.",
            "key_requirements": [],
            "overlap_analysis": [],
            "gaps_analysis": ["API response parsing error"],
            "actionable_suggestions": ["Please verify input parameters and retry."],
        }

    return {
        "match_score": int(parsed.get("match_score", 0)),
        "position_summary": str(parsed.get("position_summary", "")),
        "key_requirements": list(parsed.get("key_requirements") or []),
        "overlap_analysis": list(parsed.get("overlap_analysis") or []),
        "gaps_analysis": list(parsed.get("gaps_analysis") or []),
        "actionable_suggestions": list(parsed.get("actionable_suggestions") or []),
    }


def tailor_resume_ai(
    resume_data: Dict[str, Any],
    job_description: str,
    model: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Tailor a resume structured data based on a target job description.
    Enforces a strict zero-hallucination policy.
    Returns:
    {
      "tailored_resume_data": ResumeData,
      "changes": [ChangeMetadata, ...],
      "warnings": [str, ...]
    }
    """
    model_name = model or os.getenv("OPENAI_RESUME_MODEL", "gpt-4o-mini")

    system = {
        "role": "system",
        "content": (
            "You are an expert resume writer. Tailor the candidate's resume data to the job description.\n"
            "CRITICAL RULES:\n"
            "1. ZERO HALLUCINATION: You are strictly forbidden from inventing, fabricating, or adding any biographical details "
            "not mentioned in the original resume. Do NOT create new companies, employment dates, credentials, certifications, "
            "technologies, metrics, or outcomes. You may only rephrase, re-order, emphasize, or selectively omit factual details.\n"
            "2. Output format: Respond ONLY with a single JSON object matching the schema below. Do not use code fences.\n\n"
            "Schema:\n"
            "{\n"
            '  "tailored_resume_data": <modified version of input resume JSON matching exactly the structure>,\n'
            '  "changes": [\n'
            '    {\n'
            '      "path": "<dot-path of the field changed, e.g. summary or experience.0.bullets.1 or skills>",\n'
            '      "before": "<original text>",\n'
            '      "after": "<updated tailored text>",\n'
            '      "reason": "<short explanation of why this change aligns with the job listing>"\n'
            "    }, ...\n"
            "  ],\n"
            '  "warnings": ["list of key warnings identifying missing requirements in the job description that could not be added because they are absent from original resume. e.g. \'AWS experience required but absent from original resume.\'"]\n'
            "}"
        )
    }

    user = {
        "role": "user",
        "content": (
            f"Original Resume JSON:\n{json.dumps(resume_data)}\n\n"
            f"Job Description:\n{job_description}\n\n"
            "Instructions: Rewrite the professional summary, rephrase or reorder experience bullet points, "
            "and reorder skills to match the job post. Maintain strict factuality. Return the JSON object."
        )
    }

    out = call_openai_chat(model_name, [system, user], max_tokens=1500, temperature=0.2)
    raw = out.get("raw", "") or ""

    try:
        start = raw.index("{")
        end = raw.rfind("}")
        json_str = raw[start:end + 1]
        json_str = json_str.replace("```json", "").replace("```", "").strip()
        parsed = json.loads(json_str)
    except Exception:
        return {
            "tailored_resume_data": resume_data,
            "changes": [],
            "warnings": ["Failed to parse tailored response from AI."],
        }

    return {
        "tailored_resume_data": parsed.get("tailored_resume_data") or resume_data,
        "changes": parsed.get("changes") or [],
        "warnings": parsed.get("warnings") or [],
    }
