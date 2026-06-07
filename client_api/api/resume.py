from fastapi import APIRouter, File, UploadFile, HTTPException, Depends, Body, Request
from fastapi.responses import FileResponse, Response, StreamingResponse
from pydantic import BaseModel, field_validator
from typing import Any, List, Optional
import uuid
import json
import base64
import html
import os
import secrets
import tempfile
import time
from datetime import datetime
from pathlib import Path
from common.logger import get_logger
from client_api.deps.auth import get_current_user
from client_api.services.supabase_client import get_connection
from client_api.services.resume_chat.providers import ResumeLLMProviderUnavailable
from client_api.services.resume_chat.schemas import (
    ResumeChatRequest,
    ResumeChatStreamEvent,
    ResumeRewriteSectionRequest,
    ResumeRewriteSectionResponse,
    ResumeRewriteStreamEvent,
)
from client_api.services.resume_chat.service import (
    generate_resume_rewrite_suggestion,
    stream_resume_chat_response,
    stream_resume_rewrite_suggestion,
)

router = APIRouter(tags=["resume"])
logging = get_logger()

PDF_PREVIEW_TTL_SECONDS = 10 * 60


def _resume_pdf_preview_dir() -> Path:
    configured_dir = os.getenv("RESUME_PDF_PREVIEW_DIR")
    return Path(configured_dir) if configured_dir else Path(tempfile.gettempdir()) / "jaice-resume-pdf-previews"


def _cleanup_expired_resume_pdf_previews(preview_dir: Path) -> None:
    expires_before = time.time() - PDF_PREVIEW_TTL_SECONDS
    for preview_path in preview_dir.glob("*.pdf"):
        try:
            if preview_path.stat().st_mtime < expires_before:
                preview_path.unlink()
        except OSError:
            continue


def _store_resume_pdf_preview(pdf_bytes: bytes) -> str:
    preview_dir = _resume_pdf_preview_dir()
    preview_dir.mkdir(parents=True, exist_ok=True)
    _cleanup_expired_resume_pdf_previews(preview_dir)
    token = secrets.token_urlsafe(24)
    (preview_dir / f"{token}.pdf").write_bytes(pdf_bytes)
    return token


def _resume_pdf_debug_enabled(request: Request) -> bool:
    return (
        os.getenv("RESUME_PDF_DEBUG") == "1"
        or request.query_params.get("debug_pdf") == "1"
    )


def _resume_pdf_debug_dir() -> Path:
    default_debug_dir = (
        "C:/tmp/jaice-resume-pdf-debug"
        if os.name == "nt"
        else "/tmp/jaice-resume-pdf-debug"
    )
    return Path(os.getenv("RESUME_PDF_DEBUG_DIR", default_debug_dir))


def _resume_pdf_debug_host_path(filename: str) -> Optional[str]:
    host_dir = os.getenv("RESUME_PDF_DEBUG_HOST_DIR")
    if not host_dir:
        return None
    return str(Path(host_dir) / filename)


# ---------------------------------------
# Pydantic Schemas for Resume Data
# ---------------------------------------

class ResumeBullet(BaseModel):
    id: Optional[str] = None
    text: str


class ExperienceItem(BaseModel):
    id: Optional[str] = None
    jobTitle: str
    company: Optional[str] = None
    location: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    bullets: List[ResumeBullet] = []


class EducationItem(BaseModel):
    id: Optional[str] = None
    school: str
    degree: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    details: List[ResumeBullet] = []


class SkillCategory(BaseModel):
    id: Optional[str] = None
    category: str = "Skills"
    items: List[str] = []

    @field_validator("items", mode="before")
    @classmethod
    def normalize_items(cls, value):
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item and item.strip()]
        return value


class CustomContactField(BaseModel):
    label: str = ""
    value: str = ""


class ResumeFormatting(BaseModel):
    pageSize: str = "a4"
    titleFontSize: float = 24
    headerFontSize: float = 16
    bodyFontSize: float = 12
    pageMarginPt: float = 42
    paperLayoutFormat: str = "standard"


class ResumeData(BaseModel):
    fullName: str
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    summary: Optional[str] = None
    experience: List[ExperienceItem] = []
    education: List[EducationItem] = []
    skills: List[SkillCategory] = []
    customContact: List[CustomContactField] = []
    hiddenContactFields: List[str] = []
    formatting: ResumeFormatting = ResumeFormatting()

    @field_validator("skills", mode="before")
    @classmethod
    def normalize_skills(cls, value):
        if not value:
            return []
        if isinstance(value, list) and all(isinstance(item, str) for item in value):
            items = [item.strip() for item in value if item and item.strip()]
            return [{"id": "skills-default", "category": "Skills", "items": items}] if items else []
        return value


# ---------------------------------------
# Pydantic Schemas for Resume DB CRUD
# ---------------------------------------

class SaveResumeRequest(BaseModel):
    name: str
    is_master: bool = False
    source_resume_id: Optional[str] = None
    resume_data: ResumeData
    target_job_title: Optional[str] = None
    target_job_description: Optional[str] = None


class UpdateResumeRequest(BaseModel):
    name: str
    is_master: bool = False
    resume_data: ResumeData
    target_job_title: Optional[str] = None
    target_job_description: Optional[str] = None


# ---------------------------------------
# Pydantic Schemas for AI Operations
# ---------------------------------------

class ChangeMetadata(BaseModel):
    path: str
    before: str
    after: str
    reason: str


class TailorResumeRequest(BaseModel):
    resume_data: ResumeData
    job_description: str


class TailorResumeResponse(BaseModel):
    tailored_resume_data: ResumeData
    changes: List[ChangeMetadata]
    warnings: List[str]


class AnalysisResponse(BaseModel):
    match_score: int
    position_summary: str
    key_requirements: List[str]
    overlap_analysis: List[str]
    gaps_analysis: List[str]
    actionable_suggestions: List[str]


class ImproveBulletRequest(BaseModel):
    bullet_text: str
    job_title: Optional[str] = None
    company: Optional[str] = None


class ImproveBulletResponse(BaseModel):
    improved_bullet: str


class ImproveSummaryRequest(BaseModel):
    summary_text: str
    target_role: Optional[str] = None


class ImproveSummaryResponse(BaseModel):
    improved_summary: str


class EvaluateStructuredResponse(BaseModel):
    score: int
    strengths: List[str]
    weaknesses: List[str]
    suggestions: str
    checklist: List[str]
    raw: str


@router.post(
    "/chat/stream",
    summary="Stream a unified response from the resume assistant",
)
async def resume_chat_stream_endpoint(
    payload: ResumeChatRequest, user: dict = Depends(get_current_user)
) -> StreamingResponse:
    async def stream():
        try:
            async for chunk in stream_resume_chat_response(payload):
                yield chunk
        except ResumeLLMProviderUnavailable as e:
            yield ResumeChatStreamEvent(event="error", message=str(e)).model_dump_json(exclude_none=True) + "\n"
        except Exception:
            logging.error("Error streaming resume chat response", exc_info=True)
            yield ResumeChatStreamEvent(event="error", message="Failed to stream resume chat response.").model_dump_json(exclude_none=True) + "\n"

    return StreamingResponse(stream(), media_type="application/x-ndjson")


@router.post(
    "/rewrite-suggestion",
    summary="Generate a reviewable AI rewrite for one resume section",
    response_model=ResumeRewriteSectionResponse,
)
async def resume_rewrite_suggestion_endpoint(
    payload: ResumeRewriteSectionRequest, user: dict = Depends(get_current_user)
) -> ResumeRewriteSectionResponse:
    try:
        return await generate_resume_rewrite_suggestion(payload)
    except ResumeLLMProviderUnavailable as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except Exception as e:
        logging.error("Error generating resume rewrite suggestion", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate resume rewrite suggestion.") from e


@router.post(
    "/rewrite-suggestion/stream",
    summary="Stream a reviewable AI rewrite for one resume section",
)
async def resume_rewrite_suggestion_stream_endpoint(
    payload: ResumeRewriteSectionRequest, user: dict = Depends(get_current_user)
) -> StreamingResponse:
    async def stream():
        try:
            async for chunk in stream_resume_rewrite_suggestion(payload):
                yield chunk
        except ResumeLLMProviderUnavailable as e:
            yield ResumeRewriteStreamEvent(event="error", target=payload.target, message=str(e)).model_dump_json(exclude_none=True) + "\n"
        except Exception:
            logging.error("Error streaming resume rewrite suggestion", exc_info=True)
            yield ResumeRewriteStreamEvent(event="error", target=payload.target, message="Failed to stream resume rewrite suggestion.").model_dump_json(exclude_none=True) + "\n"

    return StreamingResponse(stream(), media_type="application/x-ndjson")


SECTION_GAPS = {
    "compact": 6,
    "standard": 10,
    "relaxed": 16,
}


def _safe_text(value: Optional[str]) -> str:
    return html.escape((value or "").strip())


def _font_data_uri(path: Path) -> Optional[str]:
    try:
        return f"data:font/ttf;base64,{base64.b64encode(path.read_bytes()).decode('ascii')}"
    except FileNotFoundError:
        return None


def _font_face_css() -> str:
    root = Path(__file__).resolve().parents[2]
    font_root = root / "client" / "assets" / "fonts"
    fonts = [
        ("Poppins", 400, "normal", font_root / "Poppins" / "Poppins-Regular.ttf"),
        ("Poppins", 400, "italic", font_root / "Poppins" / "Poppins-Italic.ttf"),
        ("Poppins", 500, "normal", font_root / "Poppins" / "Poppins-Medium.ttf"),
        ("Poppins", 500, "italic", font_root / "Poppins" / "Poppins-MediumItalic.ttf"),
        ("Poppins", 600, "normal", font_root / "Poppins" / "Poppins-SemiBold.ttf"),
        ("Poppins", 600, "italic", font_root / "Poppins" / "Poppins-SemiBoldItalic.ttf"),
        ("Poppins", 700, "normal", font_root / "Poppins" / "Poppins-Bold.ttf"),
        ("Poppins", 700, "italic", font_root / "Poppins" / "Poppins-BoldItalic.ttf"),
        ("Libre Baskerville", 400, "normal", font_root / "Libre_Baskerville" / "LibreBaskerville-Regular.ttf"),
        ("Libre Baskerville", 400, "italic", font_root / "Libre_Baskerville" / "LibreBaskerville-Italic.ttf"),
        ("Libre Baskerville", 700, "normal", font_root / "Libre_Baskerville" / "LibreBaskerville-Bold.ttf"),
    ]
    rules = []
    for family, weight, style, path in fonts:
        data_uri = _font_data_uri(path)
        if not data_uri:
            continue
        rules.append(
            "@font-face { "
            f"font-family: '{family}'; "
            f"src: url('{data_uri}') format('truetype'); "
            f"font-weight: {weight}; font-style: {style}; font-display: block; "
            "}"
        )
    return "\n".join(rules)


def _paper_dimensions(page_size: str) -> tuple[str, str, str]:
    if page_size == "letter":
        return "8.5in", "11in", "Letter"
    return "210mm", "297mm", "A4"


def _paper_viewport_dimensions(page_name: str) -> dict[str, int]:
    if page_name == "Letter":
        return {"width": 816, "height": 1056}
    return {"width": 794, "height": 1123}


def _render_contact_items(payload: ResumeData) -> List[str]:
    hidden = set(payload.hiddenContactFields or [])
    items = [
        value
        for key, value in [
            ("location", payload.location or ""),
            ("phone", payload.phone or ""),
            ("email", payload.email or ""),
            ("linkedin", payload.linkedin or ""),
            ("website", payload.website or ""),
            ("github", payload.github or ""),
        ]
        if key not in hidden and value and value.strip()
    ]
    items.extend([field.value for field in (payload.customContact or []) if field.value and field.value.strip()])
    return items


def _render_contact_html(payload: ResumeData) -> str:
    items = [_safe_text(item) for item in _render_contact_items(payload)]
    if not items:
        return ""

    rows = []
    for index in range(0, len(items), 3):
        row_items = items[index:index + 3]
        row_html = []
        for item_index, item in enumerate(row_items):
            if item_index > 0:
                row_html.append("<span class='divider'>&bull;</span>")
            row_html.append(f"<span>{item}</span>")
        rows.append(f"<div class='contact-row'>{''.join(row_html)}</div>")
    return f"<div class='contact-strip'>{''.join(rows)}</div>"


def _render_resume_pdf_html(
    payload: ResumeData,
    document_title: Optional[str] = None,
) -> tuple[str, str, str, str, float]:
    formatting = payload.formatting or ResumeFormatting()
    page_size = formatting.pageSize if formatting.pageSize in {"a4", "letter"} else "a4"
    page_width, page_height, page_name = _paper_dimensions(page_size)
    section_gap = SECTION_GAPS.get(formatting.paperLayoutFormat, SECTION_GAPS["standard"])
    margin_pt = max(0, float(formatting.pageMarginPt or 0))
    title_font = float(formatting.titleFontSize or 24)
    header_font = float(formatting.headerFontSize or 16)
    body_font = float(formatting.bodyFontSize or 12)

    sections = []

    header_html = f"""
        <section class="resume-section">
            <h1>{_safe_text(payload.fullName) or "Your Name"}</h1>
            {_render_contact_html(payload)}
        </section>
    """
    sections.append(header_html)

    if payload.summary and payload.summary.strip():
        sections.append(f"""
            <section class="resume-section">
                <h2>Professional Summary</h2>
                <p class="body-text">{_safe_text(payload.summary)}</p>
            </section>
        """)

    if payload.experience:
        experience_items = []
        for exp in payload.experience:
            bullets = "".join(
                f"<div class='bullet-row'><span class='bullet-marker'>&bull;</span><div class='bullet-text'>{_safe_text(bullet.text)}</div></div>"
                for bullet in (exp.bullets or [])
                if bullet.text and bullet.text.strip()
            )
            date_parts = [part for part in [exp.startDate, exp.endDate] if part and part.strip()]
            dates = ""
            if date_parts:
                dates = "<div class='date-row'>" + "<span class='date-separator'>-</span>".join(
                    f"<span class='date-field'>{_safe_text(part)}</span>" for part in date_parts
                ) + "</div>"
            left_parts = [
                f"<span class='meta-field meta-field-title'>{_safe_text(exp.jobTitle)}</span>" if exp.jobTitle else "",
                f"<span class='meta-field meta-field-company'>{_safe_text(exp.company)}</span>" if exp.company else "",
                f"<span class='meta-field meta-field-location'>{_safe_text(exp.location)}</span>" if exp.location else "",
            ]
            left_html = "<span class='meta-separator'>|</span>".join([part for part in left_parts if part])
            if not left_html and not dates and not bullets:
                continue
            experience_items.append(f"""
                <article class="experience-item">
                    {f"<div class='meta-row experience-row'><div class='meta-left'>{left_html}</div>{dates}</div>" if left_html or dates else ""}
                    {f"<div class='bullet-stack experience-bullets'>{bullets}</div>" if bullets else ""}
                </article>
            """)
        if experience_items:
            sections.append(f"""
                <section class="resume-section experience-section">
                    <h2>Work Experience</h2>
                    <div class="item-stack">{''.join(experience_items)}</div>
                </section>
            """)

    if payload.education:
        education_items = []
        for ed in payload.education:
            details = "".join(
                f"<div class='bullet-row'><span class='bullet-marker'>&bull;</span><div class='bullet-text'>{_safe_text(detail.text)}</div></div>"
                for detail in (ed.details or [])
                if detail.text and detail.text.strip()
            )
            date_parts = [part for part in [ed.startDate, ed.endDate] if part and part.strip()]
            dates = ""
            if date_parts:
                dates = "<div class='date-row'>" + "<span class='date-separator'>-</span>".join(
                    f"<span class='date-field'>{_safe_text(part)}</span>" for part in date_parts
                ) + "</div>"
            left_parts = [
                f"<span class='meta-field meta-field-degree'>{_safe_text(ed.degree)}</span>" if ed.degree else "",
                f"<span class='meta-field meta-field-school'>{_safe_text(ed.school)}</span>" if ed.school else "",
            ]
            left_html = "<span class='meta-separator'>|</span>".join([part for part in left_parts if part])
            if not left_html and not dates and not details:
                continue
            education_items.append(f"""
                <article class="education-item">
                    {f"<div class='meta-row education-row'><div class='meta-left'>{left_html}</div>{dates}</div>" if left_html or dates else ""}
                    {f"<div class='bullet-stack education-details'>{details}</div>" if details else ""}
                </article>
            """)
        if education_items:
            sections.append(f"""
                <section class="resume-section">
                    <h2>Education</h2>
                    <div class="item-stack education-stack">{''.join(education_items)}</div>
                </section>
            """)

    skill_rows = []
    for skill in payload.skills or []:
        items = [item.strip() for item in (skill.items or []) if item and item.strip()]
        category = (skill.category or "").strip()
        if not items:
            continue
        skill_rows.append(f"""
            <div class="skill-row">
                {f"<span class='skill-category'>{_safe_text(category)}</span>" if category else ""}
                {f"<span class='skill-colon'>:</span>" if category else ""}
                <span class="skill-items">{_safe_text(", ".join(items))}</span>
            </div>
        """)
    if skill_rows:
        sections.append(f"""
            <section class="resume-section final-section">
                <h2>Skills</h2>
                <div class="skill-stack">{''.join(skill_rows)}</div>
            </section>
        """)

    css = f"""
        {_font_face_css()}
        /* Canvas-first typography: mirrors client/pages/Resume/resumeTypography.ts. */
        @page {{ size: {page_name}; margin: 0; }}
        html, body {{
            margin: 0;
            padding: 0;
            background: #ffffff;
            color: #0f172a;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }}
        * {{ box-sizing: border-box; }}
        body {{
            font-family: "Libre Baskerville", serif;
            font-size: {body_font}px;
            line-height: 1.38;
            text-align: left;
        }}
        .page {{
            width: {page_width};
            height: {page_height};
            min-height: {page_height};
            padding: {margin_pt}pt;
            box-sizing: border-box;
            background: #ffffff;
            overflow: visible;
        }}
        .resume-section {{
            width: 100%;
            margin: 0 0 {section_gap}px;
            text-align: left;
            break-inside: auto;
        }}
        .resume-section h2 {{
            break-after: avoid;
        }}
        .experience-item,
        .education-item,
        .skill-row {{
            break-inside: avoid;
        }}
        .final-section {{ margin-bottom: 0; }}
        h1 {{
            margin: 0 0 2px;
            padding: 4px 6px;
            text-align: center;
            font-family: Poppins, Arial, sans-serif;
            font-size: {title_font}px;
            font-weight: 700;
            font-style: normal;
            line-height: 1;
            color: #0f172a;
        }}
        .contact-strip {{
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2px;
            padding: 2px 6px 0;
            color: #475569;
            font-family: Poppins, Arial, sans-serif;
            font-size: {body_font}px;
            font-weight: 500;
            line-height: 1.2;
            white-space: nowrap;
        }}
        .contact-row {{
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
            max-width: 100%;
        }}
        .divider, .meta-separator, .date-separator {{
            color: #cbd5e1;
            flex: 0 0 auto;
            font-weight: 500;
        }}
        h2 {{
            width: 100%;
            margin: 0 0 4px;
            padding: 0 0 2px;
            border-bottom: 1px solid #cbd5e1;
            font-family: Poppins, Arial, sans-serif;
            font-size: {header_font}px;
            font-weight: 700;
            font-style: normal;
            line-height: 1.1;
            letter-spacing: 0;
            text-align: left;
            text-transform: uppercase;
            color: #0f172a;
        }}
        .body-text {{
            margin: 0;
            padding: 2px 6px;
            color: #334155;
            font-family: "Libre Baskerville", serif;
            font-size: {body_font}px;
            font-weight: 400;
            font-style: normal;
            line-height: 1.45;
            text-align: left;
            white-space: pre-wrap;
        }}
        .item-stack {{
            display: flex;
            flex-direction: column;
            gap: 6px;
        }}
        .education-stack {{ gap: 6px; }}
        .meta-row {{
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            flex-wrap: wrap;
            column-gap: 16px;
            row-gap: 4px;
            margin: 0;
            color: #475569;
            font-family: Poppins, Arial, sans-serif;
            font-size: {body_font}px;
            font-weight: 500;
            font-style: normal;
            line-height: 1.25;
        }}
        .experience-row {{ margin-bottom: 10px; }}
        .education-row {{ margin-bottom: 0; }}
        .meta-left {{
            display: flex;
            align-items: baseline;
            flex-wrap: wrap;
            gap: 6px;
            min-width: 0;
            flex: 1 1 auto;
            overflow: visible;
        }}
        .meta-field,
        .date-field {{
            flex: 0 0 auto;
            padding: 2px 6px;
            font-style: normal;
        }}
        .meta-field-title,
        .meta-field-degree {{
            color: #0f172a;
            font-weight: 700;
        }}
        .meta-field-company,
        .meta-field-school {{
            color: #1f2937;
            font-weight: 600;
        }}
        .meta-field-location {{
            color: #475569;
            font-weight: 600;
        }}
        .date-row {{
            display: flex;
            align-items: baseline;
            flex-wrap: wrap;
            gap: 4px;
            flex: 0 0 auto;
            color: #475569;
            font-weight: 500;
            font-style: normal;
        }}
        .bullet-stack {{
            display: flex;
            flex-direction: column;
            gap: 2px;
            margin: 0 0 0 12px;
        }}
        .education-details {{
            margin-top: 2px;
        }}
        .bullet-row {{
            display: flex;
            align-items: flex-start;
            gap: 8px;
        }}
        .bullet-marker {{
            display: inline-block;
            flex: 0 0 auto;
            padding: 2px 0;
            color: #475569;
            font-family: "Libre Baskerville", serif;
            font-size: {body_font}px;
            font-weight: 400;
            font-style: normal;
            line-height: 1.38;
        }}
        .bullet-text {{
            min-width: 0;
            flex: 1 1 auto;
            padding: 2px 6px;
            color: #334155;
            font-family: "Libre Baskerville", serif;
            font-size: {body_font}px;
            font-weight: 400;
            font-style: normal;
            line-height: 1.38;
            text-align: left;
            white-space: pre-wrap;
            overflow-wrap: break-word;
        }}
        .skill-stack {{
            display: flex;
            flex-direction: column;
            gap: 4px;
        }}
        .skill-row {{
            display: flex;
            align-items: flex-start;
            justify-content: flex-start;
            gap: 6px;
            color: #334155;
            font-family: "Libre Baskerville", serif;
            font-size: {body_font}px;
            font-weight: 400;
            font-style: normal;
            line-height: 1.38;
            text-align: left;
        }}
        .skill-category {{
            flex: 0 0 auto;
            padding: 2px 6px;
            color: #0f172a;
            font-family: Poppins, Arial, sans-serif;
            font-weight: 700;
            font-style: normal;
            line-height: 1.25;
            text-align: left;
        }}
        .skill-colon {{
            flex: 0 0 auto;
            padding-top: 4px;
            color: #0f172a;
            font-family: "Libre Baskerville", serif;
            font-weight: 700;
            font-style: normal;
            line-height: 1;
        }}
        .skill-items {{
            min-width: 0;
            padding: 2px 6px;
            white-space: pre-wrap;
            overflow-wrap: break-word;
        }}
    """

    document = f"""
        <!doctype html>
        <html>
            <head>
                <meta charset="utf-8" />
                <title>{html.escape(document_title or payload.fullName or "resume")}</title>
                <style>{css}</style>
            </head>
            <body>
                <main class="page">
                    {''.join(sections)}
                </main>
            </body>
        </html>
    """
    return document, page_width, page_height, page_name, margin_pt


# ----------------------------
# CRUD endpoints for Resumes
# ----------------------------

@router.get("/resumes", summary="List all resumes for the authenticated user")
async def list_resumes(user: dict = Depends(get_current_user)) -> Any:
    uid = user.get("uid")
    trace_id = str(uuid.uuid4())
    logging.info(f"[{trace_id}] Listing resumes for user {uid}")

    query = """
        SELECT id, name, is_master, schema_version, source_resume_id, 
               resume_data, target_job_title, target_job_description, 
               created_at, updated_at
        FROM public.resumes
        WHERE user_uid = $1
        ORDER BY is_master DESC, updated_at DESC
    """
    try:
        async with get_connection() as conn:
            rows = await conn.fetch(query, uid)
            resumes = []
            for r in rows:
                res_dict = dict(r)
                # Convert UUID and datetime objects to strings for clean JSON response
                res_dict["id"] = str(res_dict["id"])
                if res_dict["source_resume_id"]:
                    res_dict["source_resume_id"] = str(res_dict["source_resume_id"])
                if isinstance(res_dict.get("resume_data"), str):
                    try:
                        res_dict["resume_data"] = json.loads(res_dict["resume_data"])
                    except Exception as json_err:
                        logging.error(f"[{trace_id}] Failed to parse resume_data JSON for resume {res_dict['id']}: {json_err}")
                res_dict["created_at"] = res_dict["created_at"].isoformat()
                res_dict["updated_at"] = res_dict["updated_at"].isoformat()
                resumes.append(res_dict)
            return {"status": "success", "resumes": resumes}
    except Exception as e:
        logging.error(f"[{trace_id}] Error listing resumes: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to list resumes: {e}")


@router.post("/resumes", summary="Save a new resume version")
async def save_resume(
    payload: SaveResumeRequest, user: dict = Depends(get_current_user)
) -> Any:
    uid = user.get("uid")
    trace_id = str(uuid.uuid4())
    logging.info(f"[{trace_id}] Creating new resume '{payload.name}' for user {uid}")

    source_id = None
    if payload.source_resume_id:
        try:
            source_id = uuid.UUID(payload.source_resume_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid source_resume_id UUID format")

    try:
        async with get_connection() as conn:
            # Transaction block
            async with conn.transaction():
                # If setting as master, clear any existing master badges for this user
                if payload.is_master:
                    logging.info(f"[{trace_id}] Setting new master; clearing old master(s) for user {uid}")
                    await conn.execute(
                        "UPDATE public.resumes SET is_master = FALSE WHERE user_uid = $1", uid
                    )

                query = """
                    INSERT INTO public.resumes (
                        user_uid, name, is_master, schema_version, source_resume_id, 
                        resume_data, target_job_title, target_job_description, 
                        created_at, updated_at
                    ) VALUES ($1, $2, $3, 1, $4, $5, $6, $7, now(), now())
                    RETURNING id, name, is_master, schema_version, source_resume_id, 
                              resume_data, target_job_title, target_job_description, 
                              created_at, updated_at
                """
                row = await conn.fetchrow(
                    query,
                    uid,
                    payload.name,
                    payload.is_master,
                    source_id,
                    payload.resume_data.model_dump_json(),
                    payload.target_job_title,
                    payload.target_job_description
                )

                if not row:
                    raise HTTPException(status_code=500, detail="Failed to insert resume record")

                res_dict = dict(row)
                res_dict["id"] = str(res_dict["id"])
                if res_dict["source_resume_id"]:
                    res_dict["source_resume_id"] = str(res_dict["source_resume_id"])
                if isinstance(res_dict.get("resume_data"), str):
                    try:
                        res_dict["resume_data"] = json.loads(res_dict["resume_data"])
                    except Exception as json_err:
                        logging.error(f"[{trace_id}] Failed to parse resume_data JSON for saved resume {res_dict['id']}: {json_err}")
                res_dict["created_at"] = res_dict["created_at"].isoformat()
                res_dict["updated_at"] = res_dict["updated_at"].isoformat()
                return {"status": "success", "resume": res_dict}

    except Exception as e:
        logging.error(f"[{trace_id}] Error creating resume: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create resume: {e}")


@router.put("/resumes/{resume_id}", summary="Update an existing resume version")
async def update_resume(
    resume_id: str, payload: UpdateResumeRequest, user: dict = Depends(get_current_user)
) -> Any:
    uid = user.get("uid")
    trace_id = str(uuid.uuid4())
    logging.info(f"[{trace_id}] Updating resume {resume_id} for user {uid}")

    try:
        res_uuid = uuid.UUID(resume_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid resume_id UUID format")

    try:
        async with get_connection() as conn:
            # Transaction block
            async with conn.transaction():
                # Verify that the resume exists and belongs to the user (RLS fallback validation)
                exists = await conn.fetchval(
                    "SELECT 1 FROM public.resumes WHERE id = $1 AND user_uid = $2", res_uuid, uid
                )
                if not exists:
                    raise HTTPException(status_code=404, detail="Resume not found or access denied")

                # If setting as master, clear any existing master badges for this user
                if payload.is_master:
                    logging.info(f"[{trace_id}] Setting resume {resume_id} as master; clearing others for user {uid}")
                    await conn.execute(
                        "UPDATE public.resumes SET is_master = FALSE WHERE user_uid = $1 AND id != $2", uid, res_uuid
                    )

                query = """
                    UPDATE public.resumes
                    SET name = $1, is_master = $2, resume_data = $3, 
                        target_job_title = $4, target_job_description = $5, updated_at = now()
                    WHERE id = $6 AND user_uid = $7
                    RETURNING id, name, is_master, schema_version, source_resume_id, 
                              resume_data, target_job_title, target_job_description, 
                              created_at, updated_at
                """
                row = await conn.fetchrow(
                    query,
                    payload.name,
                    payload.is_master,
                    payload.resume_data.model_dump_json(),
                    payload.target_job_title,
                    payload.target_job_description,
                    res_uuid,
                    uid
                )

                if not row:
                    raise HTTPException(status_code=500, detail="Failed to update resume record")

                res_dict = dict(row)
                res_dict["id"] = str(res_dict["id"])
                if res_dict["source_resume_id"]:
                    res_dict["source_resume_id"] = str(res_dict["source_resume_id"])
                if isinstance(res_dict.get("resume_data"), str):
                    try:
                        res_dict["resume_data"] = json.loads(res_dict["resume_data"])
                    except Exception as json_err:
                        logging.error(f"[{trace_id}] Failed to parse resume_data JSON for updated resume {res_dict['id']}: {json_err}")
                res_dict["created_at"] = res_dict["created_at"].isoformat()
                res_dict["updated_at"] = res_dict["updated_at"].isoformat()
                return {"status": "success", "resume": res_dict}

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"[{trace_id}] Error updating resume: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to update resume: {e}")


@router.delete("/resumes/{resume_id}", summary="Delete an existing resume version")
async def delete_resume(
    resume_id: str, user: dict = Depends(get_current_user)
) -> Any:
    uid = user.get("uid")
    trace_id = str(uuid.uuid4())
    logging.info(f"[{trace_id}] Deleting resume {resume_id} for user {uid}")

    try:
        res_uuid = uuid.UUID(resume_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid resume_id UUID format")

    try:
        async with get_connection() as conn:
            # Verify ownership
            exists = await conn.fetchval(
                "SELECT 1 FROM public.resumes WHERE id = $1 AND user_uid = $2", res_uuid, uid
            )
            if not exists:
                raise HTTPException(status_code=404, detail="Resume not found or access denied")

            await conn.execute(
                "DELETE FROM public.resumes WHERE id = $1 AND user_uid = $2", res_uuid, uid
            )
            return {"status": "success", "deleted_id": resume_id}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"[{trace_id}] Error deleting resume: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to delete resume: {e}")


# ----------------------------
# Existing PDF upload flow
# ----------------------------

@router.post("/upload", summary="Upload a resume PDF and receive AI feedback")
async def upload_resume(
    file: UploadFile = File(...), user: dict = Depends(get_current_user)
) -> Any:
    """Accepts a PDF file upload and returns resume evaluation from OpenAI."""
    if not file.filename.lower().endswith(".pdf") and file.content_type != "application/pdf":
        logging.error("Uploaded file is not a PDF")
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    contents = await file.read()

    try:
        from OpenAI.OpenAI_model import evaluate_resume_pdf

        result = evaluate_resume_pdf(contents)
        return result
    except Exception as e:
        logging.error("Error evaluating resume", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to evaluate resume: {e}")


# ---------------------------------------
# New: per-field AI helpers for builder
# ---------------------------------------

@router.post(
    "/improve-bullet",
    summary="Improve a single resume bullet point",
    response_model=ImproveBulletResponse,
)
async def improve_bullet(
    payload: ImproveBulletRequest, user: dict = Depends(get_current_user)
) -> ImproveBulletResponse:
    """Use AI to rewrite a single resume bullet into a stronger, impact-focused version."""
    try:
        from OpenAI.OpenAI_model import improve_resume_bullet

        out = improve_resume_bullet(
            bullet_text=payload.bullet_text,
            job_title=payload.job_title,
            company=payload.company,
        )
        return ImproveBulletResponse(**out)
    except Exception as e:
        logging.error("Error improving resume bullet", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to improve bullet: {e}")


@router.post(
    "/improve-summary",
    summary="Improve the professional summary/objective",
    response_model=ImproveSummaryResponse,
)
async def improve_summary(
    payload: ImproveSummaryRequest, user: dict = Depends(get_current_user)
) -> ImproveSummaryResponse:
    """Use AI to rewrite the professional summary section."""
    try:
        from OpenAI.OpenAI_model import improve_resume_summary

        out = improve_resume_summary(
            summary_text=payload.summary_text,
            target_role=payload.target_role,
        )
        return ImproveSummaryResponse(**out)
    except Exception as e:
        logging.error("Error improving resume summary", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to improve summary: {e}")


# ---------------------------------------
# Structured resume evaluation
# ---------------------------------------

@router.post(
    "/evaluate-structured",
    summary="Evaluate a structured resume payload from the builder",
    response_model=EvaluateStructuredResponse,
)
async def evaluate_resume_structured_endpoint(
    payload: ResumeData, user: dict = Depends(get_current_user)
) -> EvaluateStructuredResponse:
    """
    Take the structured resume JSON from the builder (form fields)
    and return the same style of feedback as the PDF evaluator.
    """
    try:
        from OpenAI.OpenAI_model import evaluate_resume_structured

        out = evaluate_resume_structured(payload.model_dump())
        return EvaluateStructuredResponse(**out)
    except Exception as e:
        logging.error("Error evaluating structured resume", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to evaluate resume: {e}")


# ---------------------------------------
# NEW Workflows: Tailoring and Analysis placeholders (Phases 3 & 4)
# ---------------------------------------

@router.post(
    "/tailor",
    summary="Tailor a resume based on a target job description",
    response_model=TailorResumeResponse,
)
async def tailor_resume_endpoint(
    payload: TailorResumeRequest, user: dict = Depends(get_current_user)
) -> TailorResumeResponse:
    """
    Accepts base resume data and a job description. Uses OpenAI to tailor 
    the resume with strict factuality and return the optimized JSON and changes diff.
    """
    try:
        from OpenAI.OpenAI_model import tailor_resume_ai
        
        out = tailor_resume_ai(
            resume_data=payload.resume_data.model_dump(),
            job_description=payload.job_description
        )
        return TailorResumeResponse(**out)
    except Exception as e:
        logging.error("Error tailoring resume", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to tailor resume: {e}")


@router.post(
    "/analyze-listing",
    summary="Analyze a resume against a target job description",
    response_model=AnalysisResponse,
)
async def analyze_listing_endpoint(
    payload: TailorResumeRequest, user: dict = Depends(get_current_user)
) -> AnalysisResponse:
    """
    Compares resume data with a job description and returns match scores, overlaps, gaps, and recommendations.
    """
    try:
        from OpenAI.OpenAI_model import analyze_job_overlap_ai
        
        out = analyze_job_overlap_ai(
            resume_data=payload.resume_data.model_dump(),
            job_description=payload.job_description
        )
        return AnalysisResponse(**out)
    except Exception as e:
        logging.error("Error analyzing job description overlap", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to analyze job: {e}")


# ---------------------------------------
# Export structured resume as PDF
# ---------------------------------------

@router.post(
    "/debug/render-diagnostics",
    summary="Persist frontend resume render diagnostics for PDF drift analysis",
)
async def save_resume_render_diagnostics(
    request: Request,
    payload: Any = Body(...),
    user: dict = Depends(get_current_user),
) -> Any:
    if not _resume_pdf_debug_enabled(request):
        raise HTTPException(status_code=404, detail="Resume render diagnostics are disabled.")

    debug_dir = _resume_pdf_debug_dir()
    debug_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    latest_filename = "frontend-render-diagnostics-latest.json"
    snapshot_filename = f"frontend-render-diagnostics-{timestamp}.json"
    latest_path = debug_dir / latest_filename
    snapshot_path = debug_dir / snapshot_filename
    serialized_payload = json.dumps(payload, indent=2, ensure_ascii=False, default=str)

    latest_path.write_text(serialized_payload, encoding="utf-8")
    snapshot_path.write_text(serialized_payload, encoding="utf-8")
    logging.info(
        "Frontend resume render diagnostics saved: "
        f"latest={latest_path}, snapshot={snapshot_path}"
    )

    return {
        "status": "success",
        "latest_path": str(latest_path),
        "snapshot_path": str(snapshot_path),
        "host_latest_path": _resume_pdf_debug_host_path(latest_filename),
        "host_snapshot_path": _resume_pdf_debug_host_path(snapshot_filename),
    }


@router.post(
    "/export-pdf",
    summary="Export a structured resume as a downloadable PDF",
)
async def export_resume_pdf(
    payload: ResumeData, request: Request, user: dict = Depends(get_current_user)
) -> Response:
    """
    Accept structured resume JSON and return a PDF file rendered by headless Chromium.
    """
    try:
        try:
            from playwright.async_api import async_playwright
        except ImportError as import_error:
            raise HTTPException(
                status_code=500,
                detail="Playwright is not installed for the client API service."
            ) from import_error

        document_title = request.query_params.get("document_title") or payload.fullName or "resume"
        filename_safe = "".join(
            char if char.isalnum() or char in {"-", "_"} else "_"
            for char in document_title.strip()
        ).strip("_") or "resume"
        pdf_filename = f"{filename_safe}.pdf"
        document_html, page_width, page_height, page_name, page_padding_pt = _render_resume_pdf_html(
            payload,
            pdf_filename,
        )
        viewport = _paper_viewport_dimensions(page_name)
        debug_enabled = _resume_pdf_debug_enabled(request)
        debug_dir = _resume_pdf_debug_dir()
        if debug_enabled:
            debug_dir.mkdir(parents=True, exist_ok=True)
            html_path = debug_dir / "resume-export.html"
            html_path.write_text(document_html, encoding="utf-8")
            logging.info(
                "Resume PDF debug page resolution: "
                f"payload_page_size={payload.formatting.pageSize if payload.formatting else None}, "
                f"resolved_page_name={page_name}, "
                f"viewport={viewport['width']}x{viewport['height']}, "
                f"pdf_width={page_width}, pdf_height={page_height}, "
                f"page_padding={page_padding_pt}pt, "
                "css_page_margin=0, playwright_pdf_margin=0"
            )
            logging.info(f"Resume PDF debug HTML saved to {html_path}")

        async with async_playwright() as playwright:
            browser = await playwright.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-dev-shm-usage"]
            )
            try:
                page = await browser.new_page(
                    viewport=viewport,
                    device_scale_factor=1,
                )
                await page.set_content(document_html, wait_until="networkidle")
                await page.emulate_media(media="print")
                await page.evaluate("document.fonts && document.fonts.ready")

                pdf_options = {
                    "width": page_width,
                    "height": page_height,
                    "margin": {"top": "0", "right": "0", "bottom": "0", "left": "0"},
                    "print_background": True,
                    "prefer_css_page_size": True,
                    "scale": 1,
                }

                if debug_enabled:
                    screenshot_path = debug_dir / "resume-before-pdf.png"
                    await page.screenshot(path=str(screenshot_path), full_page=True)
                    metrics = await page.evaluate(
                        """
                        () => {
                            const read = (selector) => {
                                const el = document.querySelector(selector);
                                if (!el) return null;
                                const rect = el.getBoundingClientRect();
                                const style = window.getComputedStyle(el);
                                const paddingLeft = parseFloat(style.paddingLeft) || 0;
                                const paddingRight = parseFloat(style.paddingRight) || 0;
                                const borderLeft = parseFloat(style.borderLeftWidth) || 0;
                                const borderRight = parseFloat(style.borderRightWidth) || 0;
                                return {
                                    selector,
                                    boundingBox: {
                                        x: rect.x,
                                        y: rect.y,
                                        width: rect.width,
                                        height: rect.height,
                                        top: rect.top,
                                        right: rect.right,
                                        bottom: rect.bottom,
                                        left: rect.left
                                    },
                                    scrollHeight: el.scrollHeight,
                                    scrollWidth: el.scrollWidth,
                                    offsetHeight: el.offsetHeight,
                                    offsetWidth: el.offsetWidth,
                                    clientHeight: el.clientHeight,
                                    clientWidth: el.clientWidth,
                                    contentOverflowHeight: Math.max(0, el.scrollHeight - el.clientHeight),
                                    computedWidth: style.width,
                                    computedHeight: style.height,
                                    computedContentWidth: rect.width - paddingLeft - paddingRight - borderLeft - borderRight,
                                    computedBoxSizing: style.boxSizing,
                                    computedPadding: {
                                        top: style.paddingTop,
                                        right: style.paddingRight,
                                        bottom: style.paddingBottom,
                                        left: style.paddingLeft
                                    },
                                    computedBorderWidth: {
                                        top: style.borderTopWidth,
                                        right: style.borderRightWidth,
                                        bottom: style.borderBottomWidth,
                                        left: style.borderLeftWidth
                                    },
                                    computedOverflow: {
                                        x: style.overflowX,
                                        y: style.overflowY
                                    },
                                    computedMargin: {
                                        top: style.marginTop,
                                        right: style.marginRight,
                                        bottom: style.marginBottom,
                                        left: style.marginLeft
                                    },
                                    computedGap: style.gap,
                                    computedFontFamily: style.fontFamily,
                                    computedFontSize: style.fontSize,
                                    computedFontWeight: style.fontWeight,
                                    computedLineHeight: style.lineHeight,
                                    computedLetterSpacing: style.letterSpacing,
                                    computedWhiteSpace: style.whiteSpace,
                                    computedOverflowWrap: style.overflowWrap,
                                    computedWordBreak: style.wordBreak
                                };
                            };
                            const readElement = (el) => {
                                if (!el) return null;
                                const rect = el.getBoundingClientRect();
                                const style = window.getComputedStyle(el);
                                const paddingLeft = parseFloat(style.paddingLeft) || 0;
                                const paddingRight = parseFloat(style.paddingRight) || 0;
                                const borderLeft = parseFloat(style.borderLeftWidth) || 0;
                                const borderRight = parseFloat(style.borderRightWidth) || 0;
                                return {
                                    boundingBox: {
                                        x: rect.x,
                                        y: rect.y,
                                        width: rect.width,
                                        height: rect.height,
                                        top: rect.top,
                                        right: rect.right,
                                        bottom: rect.bottom,
                                        left: rect.left
                                    },
                                    scrollHeight: el.scrollHeight,
                                    scrollWidth: el.scrollWidth,
                                    offsetHeight: el.offsetHeight,
                                    offsetWidth: el.offsetWidth,
                                    clientHeight: el.clientHeight,
                                    clientWidth: el.clientWidth,
                                    computedWidth: style.width,
                                    computedHeight: style.height,
                                    computedContentWidth: rect.width - paddingLeft - paddingRight - borderLeft - borderRight,
                                    computedBoxSizing: style.boxSizing,
                                    computedPadding: {
                                        top: style.paddingTop,
                                        right: style.paddingRight,
                                        bottom: style.paddingBottom,
                                        left: style.paddingLeft
                                    },
                                    computedBorderWidth: {
                                        top: style.borderTopWidth,
                                        right: style.borderRightWidth,
                                        bottom: style.borderBottomWidth,
                                        left: style.borderLeftWidth
                                    },
                                    computedMargin: {
                                        top: style.marginTop,
                                        right: style.marginRight,
                                        bottom: style.marginBottom,
                                        left: style.marginLeft
                                    },
                                    computedGap: style.gap,
                                    computedFontFamily: style.fontFamily,
                                    computedFontSize: style.fontSize,
                                    computedFontWeight: style.fontWeight,
                                    computedLineHeight: style.lineHeight,
                                    computedLetterSpacing: style.letterSpacing,
                                    computedWhiteSpace: style.whiteSpace,
                                    computedOverflowWrap: style.overflowWrap,
                                    computedWordBreak: style.wordBreak
                                };
                            };
                            const estimateLineCount = (el) => {
                                if (!el) return null;
                                const rect = el.getBoundingClientRect();
                                const lineHeight = parseFloat(window.getComputedStyle(el).lineHeight);
                                if (!lineHeight || lineHeight <= 0) return null;
                                return rect.height / lineHeight;
                            };
                            const traceChildren = (selector) => {
                                const root = document.querySelector(selector);
                                if (!root) return null;
                                const rootRect = root.getBoundingClientRect();
                                const sectionTraces = Array.from(root.children).map((child, index) => {
                                    const rect = child.getBoundingClientRect();
                                    const style = window.getComputedStyle(child);
                                    return {
                                        index,
                                        tagName: child.tagName.toLowerCase(),
                                        label: child.id || child.className || child.tagName.toLowerCase(),
                                        boundingBox: {
                                            x: rect.x,
                                            y: rect.y,
                                            width: rect.width,
                                            height: rect.height,
                                            top: rect.top,
                                            right: rect.right,
                                            bottom: rect.bottom,
                                            left: rect.left
                                        },
                                        height: rect.height,
                                        bottom: rect.bottom,
                                        marginBottom: style.marginBottom,
                                        overflowPastRootBottom: Math.max(0, rect.bottom - rootRect.bottom)
                                    };
                                });
                                const lastChild = sectionTraces[sectionTraces.length - 1] || null;
                                const maxChildBottom = sectionTraces.reduce(
                                    (max, child) => Math.max(max, child.bottom),
                                    rootRect.top
                                );

                                return {
                                    rootBottom: rootRect.bottom,
                                    maxChildBottom,
                                    lastChildBottom: lastChild ? lastChild.bottom : null,
                                    lastChildMarginBottom: lastChild ? lastChild.marginBottom : null,
                                    maxChildOverflowPastRootBottom: Math.max(0, maxChildBottom - rootRect.bottom),
                                    overflowingChildren: sectionTraces.filter((child) => child.overflowPastRootBottom > 0),
                                    sectionTraces
                                };
                            };
                            const traceExperience = () => {
                                const section = document.querySelector(".experience-section");
                                if (!section) return null;
                                const sectionRect = section.getBoundingClientRect();
                                let globalBulletIndex = 0;
                                const items = Array.from(section.querySelectorAll(".experience-item")).map((item, index) => {
                                    const itemRect = item.getBoundingClientRect();
                                    const metaRow = item.querySelector(".experience-row");
                                    const bulletStack = item.querySelector(".experience-bullets");
                                    const bulletRows = Array.from(item.querySelectorAll(".bullet-row"));
                                    const bulletRowHeights = bulletRows.map((row) => row.getBoundingClientRect().height);
                                    const bulletMetrics = bulletRows.map((row, bulletIndex) => {
                                        const marker = row.querySelector(".bullet-marker");
                                        const text = row.querySelector(".bullet-text");
                                        const currentGlobalBulletIndex = globalBulletIndex;
                                        globalBulletIndex += 1;
                                        return {
                                            index: currentGlobalBulletIndex,
                                            itemIndex: index,
                                            itemBulletIndex: bulletIndex,
                                            textPreview: text ? text.textContent.trim().slice(0, 140) : "",
                                            row: readElement(row),
                                            marker: readElement(marker),
                                            text: readElement(text),
                                            estimatedLineCount: estimateLineCount(text),
                                            appearsMultiLine: (estimateLineCount(text) || 0) > 1.25
                                        };
                                    });
                                    const previousItem = index > 0
                                        ? section.querySelectorAll(".experience-item")[index - 1]
                                        : null;
                                    const previousBottom = previousItem
                                        ? previousItem.getBoundingClientRect().bottom
                                        : null;
                                    const bulletStackRect = bulletStack ? bulletStack.getBoundingClientRect() : null;
                                    const metaRowRect = metaRow ? metaRow.getBoundingClientRect() : null;

                                    return {
                                        index,
                                        boundingBox: {
                                            x: itemRect.x,
                                            y: itemRect.y,
                                            width: itemRect.width,
                                            height: itemRect.height,
                                            top: itemRect.top,
                                            right: itemRect.right,
                                            bottom: itemRect.bottom,
                                            left: itemRect.left
                                        },
                                        top: itemRect.top,
                                        bottom: itemRect.bottom,
                                        height: itemRect.height,
                                        gapFromPreviousItem: previousBottom === null ? null : itemRect.top - previousBottom,
                                        metaRow: metaRowRect ? {
                                            top: metaRowRect.top,
                                            bottom: metaRowRect.bottom,
                                            height: metaRowRect.height,
                                            metrics: readElement(metaRow),
                                            children: metaRow ? Array.from(metaRow.children).map((child, childIndex) => ({
                                                index: childIndex,
                                                metrics: readElement(child),
                                                text: child.textContent || ""
                                            })) : []
                                        } : null,
                                        bulletStack: bulletStackRect ? {
                                            top: bulletStackRect.top,
                                            bottom: bulletStackRect.bottom,
                                            height: bulletStackRect.height
                                        } : null,
                                        bulletRowCount: bulletRows.length,
                                        firstBulletRowHeight: bulletRowHeights[0] || null,
                                        averageBulletRowHeight: bulletRowHeights.length
                                            ? bulletRowHeights.reduce((sum, height) => sum + height, 0) / bulletRowHeights.length
                                            : null,
                                        bulletRowHeights,
                                        bullets: bulletMetrics
                                    };
                                });

                                return {
                                    section: read(".experience-section"),
                                    top: sectionRect.top,
                                    bottom: sectionRect.bottom,
                                    height: sectionRect.height,
                                    itemCount: items.length,
                                    items
                                };
                            };
                            return {
                                pageModel: {
                                    resolvedPageName: %s,
                                    resolvedPageWidth: %s,
                                    resolvedPageHeight: %s,
                                    resolvedPagePaddingPt: %s,
                                    cssPageMargin: "0",
                                    playwrightPdfMargin: {
                                        top: "0",
                                        right: "0",
                                        bottom: "0",
                                        left: "0"
                                    }
                                },
                                viewport: {
                                    width: window.innerWidth,
                                    height: window.innerHeight
                                },
                                devicePixelRatio: window.devicePixelRatio,
                                bodyScrollHeight: document.body.scrollHeight,
                                htmlScrollHeight: document.documentElement.scrollHeight,
                                page: read(".page"),
                                pageChildOverflowTrace: traceChildren(".page"),
                                h1: read("h1"),
                                h2: read("h2"),
                                bodyText: read(".body-text"),
                                bulletRow: read(".bullet-row"),
                                bulletText: read(".bullet-text"),
                                bulletMarker: read(".bullet-marker"),
                                experience: traceExperience()
                            };
                        }
                        """
                        % (
                            json.dumps(page_name),
                            json.dumps(page_width),
                            json.dumps(page_height),
                            json.dumps(page_padding_pt),
                        )
                    )
                    logging.info(f"Resume PDF debug screenshot saved to {screenshot_path}")
                    logging.info(f"Resume PDF debug metrics: {json.dumps(metrics, default=str)}")
                    logging.info(f"Resume PDF debug page.pdf options: {json.dumps(pdf_options)}")

                pdf_bytes = await page.pdf(**pdf_options)
            finally:
                await browser.close()

        preview_token = _store_resume_pdf_preview(pdf_bytes)
        preview_path = f"/api/resume/pdf-preview/{preview_token}/{pdf_filename}"

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{pdf_filename}"',
                "X-PDF-Preview-Path": preview_path,
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logging.error("Error generating resume PDF", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {e}")


@router.get(
    "/pdf-preview/{token}/{filename}",
    summary="Open a short-lived generated resume PDF preview",
)
async def get_resume_pdf_preview(token: str, filename: str) -> FileResponse:
    if not token or any(char not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_" for char in token):
        raise HTTPException(status_code=404, detail="PDF preview not found.")

    preview_path = _resume_pdf_preview_dir() / f"{token}.pdf"
    try:
        preview_age = time.time() - preview_path.stat().st_mtime
    except OSError as error:
        raise HTTPException(status_code=404, detail="PDF preview not found.") from error

    if preview_age > PDF_PREVIEW_TTL_SECONDS:
        try:
            preview_path.unlink()
        except OSError:
            pass
        raise HTTPException(status_code=404, detail="PDF preview expired.")

    safe_filename = "".join(
        char if char.isalnum() or char in {"-", "_", "."} else "_"
        for char in filename
    ).strip("._") or "resume.pdf"
    if not safe_filename.lower().endswith(".pdf"):
        safe_filename = f"{safe_filename}.pdf"

    return FileResponse(
        preview_path,
        media_type="application/pdf",
        filename=safe_filename,
        content_disposition_type="inline",
        headers={"Cache-Control": "private, no-store"},
    )
