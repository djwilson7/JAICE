from fastapi import APIRouter, File, UploadFile, HTTPException, Depends, Body
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel, validator
from typing import Any, List, Optional
import uuid
import json
import base64
import html
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

    @validator("items", pre=True)
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

    @validator("skills", pre=True)
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
        ("Poppins", 400, font_root / "Poppins" / "Poppins-Regular.ttf"),
        ("Poppins", 500, font_root / "Poppins" / "Poppins-Medium.ttf"),
        ("Poppins", 600, font_root / "Poppins" / "Poppins-SemiBold.ttf"),
        ("Poppins", 700, font_root / "Poppins" / "Poppins-Bold.ttf"),
        ("Baskerville", 400, font_root / "Libre_Baskerville" / "LibreBaskerville-Regular.ttf"),
        ("Baskerville", 700, font_root / "Libre_Baskerville" / "LibreBaskerville-Bold.ttf"),
    ]
    rules = []
    for family, weight, path in fonts:
        data_uri = _font_data_uri(path)
        if not data_uri:
            continue
        rules.append(
            "@font-face { "
            f"font-family: '{family}'; "
            f"src: url('{data_uri}') format('truetype'); "
            f"font-weight: {weight}; font-style: normal; font-display: block; "
            "}"
        )
    return "\n".join(rules)


def _paper_dimensions(page_size: str) -> tuple[str, str, str]:
    if page_size == "letter":
        return "8.5in", "11in", "Letter"
    return "210mm", "297mm", "A4"


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


def _render_resume_pdf_html(payload: ResumeData) -> tuple[str, str, str, str]:
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
                f"<li>{_safe_text(bullet.text)}</li>"
                for bullet in (exp.bullets or [])
                if bullet.text and bullet.text.strip()
            )
            date_parts = [part for part in [exp.startDate, exp.endDate] if part and part.strip()]
            dates = ""
            if date_parts:
                dates = "<div class='date-row'>" + "<span class='date-separator'>-</span>".join(_safe_text(part) for part in date_parts) + "</div>"
            left_parts = [
                f"<strong>{_safe_text(exp.jobTitle)}</strong>" if exp.jobTitle else "",
                f"<strong>{_safe_text(exp.company)}</strong>" if exp.company else "",
                f"<strong>{_safe_text(exp.location)}</strong>" if exp.location else "",
            ]
            left_html = "<span class='meta-separator'>|</span>".join([part for part in left_parts if part])
            if not left_html and not dates and not bullets:
                continue
            experience_items.append(f"""
                <article class="experience-item">
                    <div class="meta-row">
                        <div class="meta-left">{left_html}</div>
                        {dates}
                    </div>
                    {f"<ul>{bullets}</ul>" if bullets else ""}
                </article>
            """)
        if experience_items:
            sections.append(f"""
                <section class="resume-section">
                    <h2>Work Experience</h2>
                    <div class="item-stack">{''.join(experience_items)}</div>
                </section>
            """)

    if payload.education:
        education_items = []
        for ed in payload.education:
            details = "".join(
                f"<li>{_safe_text(detail.text)}</li>"
                for detail in (ed.details or [])
                if detail.text and detail.text.strip()
            )
            date_parts = [part for part in [ed.startDate, ed.endDate] if part and part.strip()]
            dates = ""
            if date_parts:
                dates = "<div class='date-row'>" + "<span class='date-separator'>-</span>".join(_safe_text(part) for part in date_parts) + "</div>"
            left_parts = [
                f"<strong>{_safe_text(ed.degree)}</strong>" if ed.degree else "",
                f"<strong>{_safe_text(ed.school)}</strong>" if ed.school else "",
            ]
            left_html = "<span class='meta-separator'>|</span>".join([part for part in left_parts if part])
            if not left_html and not dates and not details:
                continue
            education_items.append(f"""
                <article class="education-item">
                    <div class="meta-row education-row">
                        <div class="meta-left">{left_html}</div>
                        {dates}
                    </div>
                    {f"<ul class='education-details'>{details}</ul>" if details else ""}
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
                {f"<strong>{_safe_text(category)}</strong>" if category else ""}
                {f"<span class='skill-colon'>:</span>" if category else ""}
                <span>{_safe_text(", ".join(items))}</span>
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
            width: {page_width};
            min-height: {page_height};
            font-family: Poppins, Arial, sans-serif;
            font-size: {body_font}px;
            line-height: 1.38;
            text-align: left;
        }}
        .page {{
            width: {page_width};
            min-height: {page_height};
            padding: {margin_pt}pt;
            background: #ffffff;
        }}
        .resume-section {{
            width: 100%;
            margin: 0 0 {section_gap}px;
            text-align: left;
        }}
        .final-section {{ margin-bottom: 0; }}
        h1 {{
            margin: 0 0 4px;
            padding: 2px 0;
            text-align: center;
            font-family: Poppins, Arial, sans-serif;
            font-size: {title_font}px;
            font-weight: 700;
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
            font-family: Arial, sans-serif;
            font-size: {header_font}px;
            font-weight: 700;
            line-height: 1.1;
            letter-spacing: 0;
            text-align: left;
            text-transform: uppercase;
            color: #0f172a;
        }}
        .body-text {{
            margin: 0;
            color: #334155;
            font-family: Poppins, Arial, sans-serif;
            font-size: {body_font}px;
            font-weight: 400;
            line-height: 1.38;
            text-align: left;
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
            gap: 16px;
            margin: 0 0 6px;
            color: #475569;
            font-family: Poppins, Arial, sans-serif;
            font-size: {body_font}px;
            font-weight: 500;
            line-height: 1.25;
            white-space: nowrap;
        }}
        .education-row {{ margin-bottom: 0; }}
        .education-details {{
            margin-top: 3px;
        }}
        .meta-left {{
            display: flex;
            align-items: baseline;
            gap: 9px;
            min-width: 0;
            flex: 1 1 auto;
            overflow: hidden;
        }}
        .meta-left strong {{
            flex: 0 0 auto;
            font-weight: 700;
        }}
        .date-row {{
            display: flex;
            align-items: baseline;
            gap: 8px;
            flex: 0 0 auto;
            color: #475569;
            font-weight: 500;
        }}
        ul {{
            margin: 0 0 0 18px;
            padding: 0;
            color: #334155;
            font-family: Poppins, Arial, sans-serif;
            font-size: {body_font}px;
            font-weight: 400;
            line-height: 1.38;
            list-style-position: outside;
            list-style-type: disc;
        }}
        li {{
            display: list-item;
            margin: 0 0 4px;
            padding-left: 4px;
            text-align: left;
        }}
        .skill-stack {{
            display: flex;
            flex-direction: column;
            gap: 6px;
        }}
        .skill-row {{
            display: flex;
            align-items: baseline;
            justify-content: flex-start;
            gap: 8px;
            color: #334155;
            font-family: Poppins, Arial, sans-serif;
            font-size: {body_font}px;
            font-weight: 400;
            line-height: 1.38;
            text-align: left;
        }}
        .skill-row strong {{
            min-width: 88px;
            flex: 0 0 auto;
            color: #0f172a;
            font-weight: 700;
            text-align: left;
        }}
        .skill-colon {{
            flex: 0 0 auto;
            color: #0f172a;
            font-weight: 700;
        }}
    """

    document = f"""
        <!doctype html>
        <html>
            <head>
                <meta charset="utf-8" />
                <style>{css}</style>
            </head>
            <body>
                <main class="page">
                    {''.join(sections)}
                </main>
            </body>
        </html>
    """
    return document, page_width, page_height, page_name


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
                    payload.resume_data.json(),
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
                    payload.resume_data.json(),
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

        out = evaluate_resume_structured(payload.dict())
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
            resume_data=payload.resume_data.dict(),
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
            resume_data=payload.resume_data.dict(),
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
    "/export-pdf",
    summary="Export a structured resume as a downloadable PDF",
)
async def export_resume_pdf(
    payload: ResumeData, user: dict = Depends(get_current_user)
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

        document_html, page_width, page_height, _page_name = _render_resume_pdf_html(payload)

        async with async_playwright() as playwright:
            browser = await playwright.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-dev-shm-usage"]
            )
            try:
                page = await browser.new_page(
                    viewport={"width": 816, "height": 1123},
                    device_scale_factor=1,
                )
                await page.set_content(document_html, wait_until="networkidle")
                await page.emulate_media(media="print")
                await page.evaluate("document.fonts && document.fonts.ready")
                pdf_bytes = await page.pdf(
                    width=page_width,
                    height=page_height,
                    margin={"top": "0", "right": "0", "bottom": "0", "left": "0"},
                    print_background=True,
                    prefer_css_page_size=True,
                    scale=1,
                )
            finally:
                await browser.close()

        filename_safe = "".join(
            char if char.isalnum() or char in {"-", "_"} else "_"
            for char in (payload.fullName or "resume").strip()
        ).strip("_") or "resume"

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename_safe}.pdf"'
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logging.error("Error generating resume PDF", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {e}")
