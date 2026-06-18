from __future__ import annotations

import io
import re

import pytest

from client_api.services.resume_pdf.generation import generate_resume_pdf

PdfReader = pytest.importorskip("PyPDF2").PdfReader


def _normalized(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def _page_texts(pdf_bytes: bytes) -> list[str]:
    reader = PdfReader(io.BytesIO(pdf_bytes))
    return [_normalized(page.extract_text() or "") for page in reader.pages]


def _font_resources(pdf_bytes: bytes) -> list[dict]:
    reader = PdfReader(io.BytesIO(pdf_bytes))
    fonts: list[dict] = []
    seen: set[tuple[int, int]] = set()
    for page in reader.pages:
        resources = page.get("/Resources", {}).get_object()
        for font_ref in resources.get("/Font", {}).get_object().values():
            identity = (font_ref.idnum, font_ref.generation)
            if identity in seen:
                continue
            seen.add(identity)
            fonts.append(font_ref.get_object())
    return fonts


def _is_embedded(font: dict) -> bool:
    descendants = font.get("/DescendantFonts", [])
    candidates = [font]
    candidates.extend(item.get_object() for item in descendants)
    for candidate in candidates:
        descriptor_ref = candidate.get("/FontDescriptor")
        if not descriptor_ref:
            continue
        descriptor = descriptor_ref.get_object()
        if any(key in descriptor for key in ("/FontFile", "/FontFile2", "/FontFile3")):
            return True
    return False


@pytest.mark.asyncio
async def test_generated_pdf_preserves_ligatures_fonts_and_page_boundary_content(tmp_path):
    pytest.importorskip("playwright.async_api")

    boundary_sentinel = (
        "BOUNDARY SENTINEL: Delivered offline workflow improvements with efficient "
        "filtering and conflict-free software releases for fifty-five field offices."
    )
    final_sentinel = "FINAL SENTINEL: Confirmed all content continued after the boundary."
    filler_bullets = [
        (
            f"FILLER {index:02d}: Built reliable software platforms with measurable "
            "delivery improvements across distributed engineering teams."
        )
        for index in range(72)
    ]
    bullets = [
        *filler_bullets[:30],
        boundary_sentinel,
        *filler_bullets[30:],
        final_sentinel,
    ]
    payload = {
        "fullName": "Avery Applicant",
        "email": "avery@example.com",
        "summary": (
            "Software Engineer building efficient offline workflows, conflict-free "
            "delivery systems, and flexible platforms."
        ),
        "experience": [
            {
                "id": "experience-1",
                "jobTitle": "Software Engineer",
                "company": "Fifty Five Labs",
                "location": "Remote",
                "startDate": "2020",
                "endDate": "Present",
                "bullets": [
                    {"id": f"bullet-{index}", "text": text}
                    for index, text in enumerate(bullets)
                ],
            }
        ],
        "formatting": {
            "pageSize": "letter",
            "bodyFontSize": 11,
            "pageMarginPt": 54,
            "paperLayoutFormat": "standard",
            "innerSectionGapFormat": "standard",
        },
    }

    generated = await generate_resume_pdf(
        payload,
        "resume-fidelity-regression",
        debug_enabled=True,
        debug_dir=tmp_path,
    )
    page_texts = _page_texts(generated.pdf_bytes)
    complete_text = _normalized(" ".join(page_texts))

    assert len(page_texts) >= 3
    assert "Software Engineer" in complete_text
    assert "efficient offline workflows" in complete_text
    assert "conflict-free delivery systems" in complete_text
    assert "flexible platforms" in complete_text
    for bullet in bullets:
        assert _normalized(bullet) in complete_text

    boundary_pages = [
        index for index, page_text in enumerate(page_texts)
        if _normalized(boundary_sentinel) in page_text
    ]
    final_pages = [
        index for index, page_text in enumerate(page_texts)
        if _normalized(final_sentinel) in page_text
    ]
    assert len(boundary_pages) == 1
    assert len(final_pages) == 1
    assert final_pages[0] > boundary_pages[0]

    fonts = _font_resources(generated.pdf_bytes)
    assert fonts
    assert all("/ToUnicode" in font for font in fonts)
    assert all(_is_embedded(font) for font in fonts)

    assert (tmp_path / "resume-export.html").exists()
    assert (tmp_path / "resume-before-pdf.png").exists()
    assert (tmp_path / "resume-render-metrics.json").exists()
