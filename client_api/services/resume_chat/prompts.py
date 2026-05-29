from __future__ import annotations

import json
from typing import Any


def resume_context_to_text(resume: dict[str, Any]) -> str:
    lines: list[str] = []
    full_name = str(resume.get("fullName") or "").strip()
    if full_name:
        lines.append(f"Candidate: {full_name}")

    summary = str(resume.get("summary") or "").strip()
    if summary:
        lines.append(f"\nSummary:\n{summary}")

    experience = resume.get("experience") or []
    if isinstance(experience, list) and experience:
        lines.append("\nExperience:")
        for index, item in enumerate(experience):
            if not isinstance(item, dict):
                continue
            title = str(item.get("jobTitle") or "").strip()
            company = str(item.get("company") or "").strip()
            exp_id = str(item.get("id") or "").strip()
            heading = " - ".join(part for part in [title, company] if part)
            lines.append(f"- Role {index + 1}{f' ({exp_id})' if exp_id else ''}: {heading or 'Untitled role'}")
            bullets = item.get("bullets") or []
            if isinstance(bullets, list):
                for bullet_index, bullet in enumerate(bullets):
                    if isinstance(bullet, dict):
                        text = str(bullet.get("text") or "").strip()
                    else:
                        text = str(bullet or "").strip()
                    if text:
                        lines.append(f"  [{bullet_index}] {text}")

    skills = resume.get("skills") or []
    if isinstance(skills, list) and skills:
        rendered_skills: list[str] = []
        for skill in skills:
            if isinstance(skill, dict):
                category = str(skill.get("category") or "").strip()
                items = skill.get("items") or []
                if isinstance(items, list):
                    rendered = ", ".join(str(item).strip() for item in items if str(item).strip())
                    if rendered:
                        rendered_skills.append(f"{category}: {rendered}" if category else rendered)
        if rendered_skills:
            lines.append("\nSkills:\n" + "\n".join(rendered_skills))

    education = resume.get("education") or []
    if isinstance(education, list) and education:
        rendered_education: list[str] = []
        for item in education:
            if isinstance(item, dict):
                school = str(item.get("school") or "").strip()
                degree = str(item.get("degree") or "").strip()
                value = " - ".join(part for part in [school, degree] if part)
                if value:
                    rendered_education.append(value)
                details = item.get("details") or []
                if isinstance(details, list):
                    for detail in details:
                        if isinstance(detail, dict):
                            text = str(detail.get("text") or "").strip()
                        else:
                            text = str(detail or "").strip()
                        if text:
                            rendered_education.append(f"  - {text}")
        if rendered_education:
            lines.append("\nEducation:\n" + "\n".join(rendered_education))

    return "\n".join(lines).strip() or "No resume content was provided."


def build_system_prompt(intent: str) -> str:
    base = (
        "You are Jaice, a concise resume assistant. Use only the resume and user-provided context. "
        "Do not invent employers, degrees, certifications, metrics, skills, or dates. "
        "If the resume does not support a claim, say what information is missing."
    )
    if intent == "conversation":
        return (
            "You are Jaice, a helpful conversational assistant inside a resume workspace. "
            "Your default job is to answer the user's actual message naturally. "
            "Do not force resume feedback, resume rewrites, job-search advice, or career coaching into casual conversation.\n\n"
            "You can help with:\n"
            "- Casual back-and-forth, greetings, brief small talk, and clarifying questions.\n"
            "- General questions about their resume (e.g. structure, readability, impact).\n"
            "- General job hunting advice, networking tips, and interview preparation.\n"
            "- Strategies for tailoring a resume without producing final edits unless asked.\n"
            "- Clarifying tradeoffs, brainstorming direction, or explaining resume best practices.\n\n"
            "Guidelines:\n"
            "1. For greetings, thanks, casual remarks, or ordinary small talk, respond casually and briefly without mentioning the resume unless the user brings it up.\n"
            "2. Do not return JSON, match scores, structured audits, or rewrite packages in conversation intent.\n"
            "3. Do not provide suggested replacement resume content unless the user asks for rewrite, improve, or exact wording.\n"
            "4. Ground resume-specific advice in the candidate's actual history (provided in the context). "
            "Do not invent fake employers, degrees, certifications, metrics, skills, or dates for them.\n"
            "5. Use resume context only when it is relevant to the user's message.\n"
            "6. Use general career knowledge when answering job-search or resume-strategy questions.\n"
            "7. Keep responses conversational and concise by default: usually 1-3 short paragraphs or a few bullets.\n"
            "8. Ask one focused follow-up only when the next useful step needs clarification."
        )
    if intent == "tailor_suggestions":
        return (
            f"{base}\n\n"
            "Intent: Tailor suggestions. Suggest improvements only for the professional summary and work-experience bullets. "
            "Keep rewrites grounded but not word-for-word: safe synonyms, clearer wording, and stronger action verbs are allowed when they do not change the factual meaning. "
            "Do not make vague bullets sound more impressive by adding teams, customers, production systems, scale, revenue, reliability, leadership, or metrics unless those details are already present. "
            "If a section is too thin to improve truthfully, return its current wording unchanged with a reason explaining that more source detail is needed. "
            "Return a single JSON object with keys assistant_message and tailor_suggestions. "
            "tailor_suggestions must contain summary and experience_bullets arrays only. "
            "Do not include suggestions for skills, education, contact info, projects, certifications, or any other section."
        )
    return (
        f"{base}\n\n"
        "Intent: Analysis. Compare the resume against the user's supplied job description or comparison context. "
        "Return a single JSON object with keys assistant_message and analysis. "
        "analysis must include match_score, requirements, overlap, gaps, missing_keywords, and suggestions."
    )


def build_user_prompt(
    intent: str,
    message: str,
    resume: dict[str, Any],
    context: str | None = None,
    include_resume_context: bool = True,
) -> str:
    resume_text = resume_context_to_text(resume)
    context_text = (context or "").strip()

    if intent == "tailor_suggestions":
        schema = {
            "assistant_message": "Brief explanation of the most important recommended changes.",
            "tailor_suggestions": {
                "summary": [
                    {
                        "current_text": "Exact current summary text being improved.",
                        "suggested_text": "Suggested replacement text.",
                        "reason": "Why this improves targeting or clarity.",
                    }
                ],
                "experience_bullets": [
                    {
                        "experience_id": "Experience id from the resume, or null.",
                        "role_title": "Role title from the resume, or null.",
                        "bullet_index": 0,
                        "current_text": "Exact current bullet text being improved.",
                        "suggested_text": "Suggested replacement bullet.",
                        "reason": "Why this improves targeting or clarity.",
                    }
                ],
            },
        }
        return (
            f"User request or job context:\n{message}\n\n"
            f"Additional context:\n{context_text or 'None provided.'}\n\n"
            f"Resume:\n{resume_text}\n\n"
            "Rewrite constraints:\n"
            "- Safe synonyms and cleaner phrasing are allowed when they do not change the factual meaning.\n"
            "- Do not add facts that are not present in the current resume item.\n"
            "- Do not add stronger scope, metrics, tools, outcomes, or adjectives just to improve impact.\n"
            "- Prefer unchanged wording over unsupported improvement.\n\n"
            "Return only JSON matching this shape:\n"
            f"{json.dumps(schema, indent=2)}"
        )

    if intent == "analysis":
        schema = {
            "assistant_message": "Brief summary of fit.",
            "analysis": {
                "match_score": 78,
                "requirements": ["Requirement from the job/context."],
                "overlap": ["Where the resume already matches."],
                "gaps": ["Specific shortage or unsupported requirement."],
                "missing_keywords": ["Keyword not clearly represented in the resume."],
                "suggestions": ["Concrete next action."],
            },
        }
        return (
            f"Comparison context or user question:\n{message}\n\n"
            f"Additional context:\n{context_text or 'None provided.'}\n\n"
            f"Resume:\n{resume_text}\n\n"
            "If no usable job description or comparison context is present, return JSON with a concise assistant_message asking the user to paste it and empty analysis arrays. "
            "Otherwise return only JSON matching this shape:\n"
            f"{json.dumps(schema, indent=2)}"
        )

    parts = [f"User message:\n{message}"]
    if context_text:
        parts.append(f"Additional context:\n{context_text}")
    if include_resume_context:
        parts.append(
            "Optional resume context. Use this only when it helps answer the user's message; "
            "ignore it for casual conversation:\n"
            f"{resume_text}"
        )
    return "\n\n".join(parts)
