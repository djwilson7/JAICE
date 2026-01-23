from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Any, List, Optional
from fpdf import FPDF
from common.logger import get_logger

router = APIRouter(tags=["resume"])
logging = get_logger()


# ----------------------------
# Existing: PDF upload flow
# ----------------------------
@router.post("/upload", summary="Upload a resume PDF and receive AI feedback")
async def upload_resume(file: UploadFile = File(...)) -> Any:
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

class ImproveBulletRequest(BaseModel):
    bullet_text: str
    job_title: Optional[str] = None
    company: Optional[str] = None


class ImproveBulletResponse(BaseModel):
    improved_bullet: str


@router.post(
    "/improve-bullet",
    summary="Improve a single resume bullet point",
    response_model=ImproveBulletResponse,
)
async def improve_bullet(payload: ImproveBulletRequest) -> ImproveBulletResponse:
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


class ImproveSummaryRequest(BaseModel):
    summary_text: str
    target_role: Optional[str] = None


class ImproveSummaryResponse(BaseModel):
    improved_summary: str


@router.post(
    "/improve-summary",
    summary="Improve the professional summary/objective",
    response_model=ImproveSummaryResponse,
)
async def improve_summary(payload: ImproveSummaryRequest) -> ImproveSummaryResponse:
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


class ResumeData(BaseModel):
    fullName: str
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None
    linkedin: Optional[str] = None
    summary: Optional[str] = None
    experience: List[ExperienceItem] = []
    education: List[EducationItem] = []
    skills: List[str] = []


class EvaluateStructuredResponse(BaseModel):
    score: int
    strengths: List[str]
    weaknesses: List[str]
    suggestions: str
    checklist: List[str]
    raw: str


@router.post(
    "/evaluate-structured",
    summary="Evaluate a structured resume payload from the builder",
    response_model=EvaluateStructuredResponse,
)
async def evaluate_resume_structured_endpoint(
    payload: ResumeData,
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
# NEW: Export structured resume as PDF
# ---------------------------------------

def render_resume_html(resume: ResumeData) -> str:
    """
    Very simple HTML template for the resume PDF.
    Uses inline CSS so xhtml2pdf can handle it more easily.
    """
    skills_str = ", ".join(resume.skills or [])

    # Build experience & education HTML
    exp_sections = []
    for exp in resume.experience:
        bullets_html = ""
        for b in exp.bullets:
            if b.text.strip():
                bullets_html += f"<li>{b.text}</li>"

        dates = " – ".join(
            [d for d in [exp.startDate or "", exp.endDate or ""] if d]
        )
        header_parts = [p for p in [exp.jobTitle, exp.company, exp.location] if p]
        header = " | ".join(header_parts)

        exp_sections.append(
            f"""
            <div class="exp-item">
              <div class="exp-header">{header or "Job Title"}</div>
              {"<div class='exp-dates'>" + dates + "</div>" if dates else ""}
              {"<ul>" + bullets_html + "</ul>" if bullets_html else ""}
            </div>
            """
        )

    edu_sections = []
    for ed in resume.education:
        dates = " – ".join(
            [d for d in [ed.startDate or "", ed.endDate or ""] if d]
        )
        header_parts = [p for p in [ed.degree, ed.school] if p]
        header = " | ".join(header_parts)

        edu_sections.append(
            f"""
            <div class="edu-item">
              <div class="edu-header">{header or "Degree"}</div>
              {"<div class='edu-dates'>" + dates + "</div>" if dates else ""}
            </div>
            """
        )

    exp_html = "".join(exp_sections)
    edu_html = "".join(edu_sections)

    # Build contact line
    contact_parts = [
        resume.email or "",
        resume.phone or "",
        resume.location or "",
        resume.website or "",
        resume.linkedin or "",
    ]
    contact_line = " • ".join([p for p in contact_parts if p])

    summary_html = (
        f"<p>{resume.summary}</p>" if (resume.summary and resume.summary.strip()) else ""
    )

    html = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body {{
      font-family: Helvetica, Arial, sans-serif;
      font-size: 11pt;
      color: #111111;
      margin: 36pt;
    }}
    h1 {{
      font-size: 20pt;
      margin: 0 0 4pt 0;
    }}
    .contact {{
      font-size: 9pt;
      color: #555555;
      margin-bottom: 16pt;
    }}
    h2.section-title {{
      font-size: 12pt;
      margin: 16pt 0 4pt 0;
      border-bottom: 1px solid #cccccc;
      padding-bottom: 2pt;
    }}
    .summary p {{
      margin: 4pt 0;
    }}
    .exp-item, .edu-item {{
      margin: 6pt 0 10pt 0;
    }}
    .exp-header, .edu-header {{
      font-weight: bold;
      font-size: 11pt;
      margin-bottom: 2pt;
    }}
    .exp-dates, .edu-dates {{
      font-size: 9pt;
      color: #555555;
      margin-bottom: 2pt;
    }}
    ul {{
      margin: 0 0 0 14pt;
      padding: 0;
    }}
    li {{
      margin: 2pt 0;
    }}
    .skills-list {{
      font-size: 10pt;
    }}
  </style>
</head>
<body>
  <h1>{resume.fullName or "Your Name"}</h1>
  {"<div class='contact'>" + contact_line + "</div>" if contact_line else ""}

  {"<h2 class='section-title'>Summary</h2><div class='summary'>" + summary_html + "</div>" if summary_html else ""}

  {"<h2 class='section-title'>Experience</h2>" + exp_html if exp_html else ""}

  {"<h2 class='section-title'>Education</h2>" + edu_html if edu_html else ""}

  {"<h2 class='section-title'>Skills</h2><div class='skills-list'>" + skills_str + "</div>" if skills_str else ""}
</body>
</html>
"""
    return html


@router.post(
    "/export-pdf",
    summary="Export a structured resume as a downloadable PDF",
)
async def export_resume_pdf(payload: ResumeData) -> Response:
    """
    Accept structured resume JSON and return a PDF file (using fpdf2).
    """
    try:
        pdf = FPDF(orientation="P", unit="mm", format="A4")
        pdf.set_auto_page_break(auto=True, margin=15)
        pdf.add_page()

        # Header: Name
        full_name = payload.fullName or "Your Name"
        pdf.set_font("Helvetica", style="B", size=18)
        pdf.cell(0, 10, full_name, ln=True)

        # Contact line (ASCII-friendly)
        contact_parts = [
            payload.email or "",
            payload.phone or "",
            payload.location or "",
            payload.website or "",
            payload.linkedin or "",
        ]
        contact_line = " | ".join([p for p in contact_parts if p])

        if contact_line:
            pdf.set_font("Helvetica", size=10)
            pdf.cell(0, 6, contact_line, ln=True)
            pdf.ln(4)

        # Summary
        if payload.summary and payload.summary.strip():
            pdf.set_font("Helvetica", style="B", size=12)
            pdf.cell(0, 8, "Summary", ln=True)
            pdf.set_font("Helvetica", size=11)
            pdf.multi_cell(0, 5, payload.summary.strip())
            pdf.ln(3)

        # Experience
        if payload.experience:
            pdf.set_font("Helvetica", style="B", size=12)
            pdf.cell(0, 8, "Experience", ln=True)
            pdf.ln(1)

            for exp in payload.experience:
                header_parts = [exp.jobTitle, exp.company, exp.location]
                header = " | ".join([h for h in header_parts if h])

                pdf.set_font("Helvetica", style="B", size=11)
                pdf.multi_cell(0, 5, header or "Job Title")

                dates = " - ".join(
                    [d for d in [exp.startDate or "", exp.endDate or ""] if d]
                )
                if dates:
                    pdf.set_font("Helvetica", size=9)
                    pdf.cell(0, 4, dates, ln=True)

                # bullets
                if exp.bullets:
                    pdf.ln(1)
                    pdf.set_font("Helvetica", size=11)
                    for b in exp.bullets:
                        text = (b.text or "").strip()
                        if not text:
                            continue
                        pdf.cell(4)  # small indent
                        # Use ASCII dash instead of Unicode bullet
                        pdf.multi_cell(0, 5, f"- {text}")
                pdf.ln(2)

        # Education
        if payload.education:
            pdf.set_font("Helvetica", style="B", size=12)
            pdf.cell(0, 8, "Education", ln=True)
            pdf.ln(1)

            for ed in payload.education:
                header_parts = [ed.degree, ed.school]
                header = " | ".join([h for h in header_parts if h])

                pdf.set_font("Helvetica", style="B", size=11)
                pdf.multi_cell(0, 5, header or "Degree")

                dates = " - ".join(
                    [d for d in [ed.startDate or "", ed.endDate or ""] if d]
                )
                if dates:
                    pdf.set_font("Helvetica", size=9)
                    pdf.cell(0, 4, dates, ln=True)
                pdf.ln(2)

        # Skills
        skills = [s.strip() for s in (payload.skills or []) if s.strip()]
        if skills:
            pdf.set_font("Helvetica", style="B", size=12)
            pdf.cell(0, 8, "Skills", ln=True)
            pdf.ln(1)

            pdf.set_font("Helvetica", size=11)
            skills_line = ", ".join(skills)
            pdf.multi_cell(0, 5, skills_line)

        # ---- IMPORTANT PART: convert to bytes ----
        # dest="S" returns a str; encode to latin-1 to get bytes.
        pdf_output = pdf.output(dest="S")
        if isinstance(pdf_output, str):
            pdf_bytes = pdf_output.encode("latin-1")
        else:
            # in case a future fpdf2 returns bytearray/bytes directly
            pdf_bytes = bytes(pdf_output)

        filename_safe = full_name.replace(" ", "_") or "resume"

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


