from client_api.api.resume import ResumeData
from client_api.services.resume_pdf.model import build_resume_render_model
from client_api.services.resume_pdf.formatting import format_px_from_pt, normalize_formatting
from client_api.services.resume_pdf.renderer import render_resume_pdf_html
from common.resume_render.spec import (
    load_document_css,
    load_formatting_css,
    load_formatting_tokens,
    load_render_fixtures,
    load_render_spec,
)


def test_shared_resume_render_assets_are_valid():
    spec = load_render_spec()
    assert spec["version"]
    assert spec["paperSizes"]["a4"]["printName"] == "A4"
    assert ".resume-document__section" in load_document_css()
    assert "--resume-default-body-font-size-pt: 9" in load_formatting_css()
    assert load_formatting_tokens()["resume-default-page-margin-pt"] == 54


def test_python_render_model_matches_shared_fixtures():
    fixtures = load_render_fixtures()
    for case in fixtures["cases"]:
        payload = ResumeData(**case["input"])
        assert build_resume_render_model(payload) == case["expected"], case["name"]


def test_css_tokens_drive_backend_defaults_and_independent_inner_spacing():
    normalized = normalize_formatting(
        {
            "paperLayoutFormat": "relaxed",
            "innerSectionGapFormat": "compact",
        }
    )
    assert normalized.body_font_size == 9
    assert normalized.page_margin_pt == 54
    assert normalized.section_gap_pt == 16
    assert normalized.inner_section_gap_pt == 4
    assert format_px_from_pt(12) == "16px"


def test_backend_html_uses_canonical_tokens_and_semantic_classes_only():
    document, *_ = render_resume_pdf_html(
        {
            "fullName": "Ada Lovelace",
            "email": "ada@example.com",
            "summary": "Computing pioneer.",
            "formatting": {"bodyFontSize": 13.5},
        }
    )
    assert "--resume-body-font-size: 18px" in document
    assert "resume-formatting-context resume-document" in document
    assert "resume-font--title" in document
    assert "resume-font--body" in document
    assert "font-variant-ligatures: none" in document
    assert 'font-feature-settings: "liga" 0, "clig" 0' in document
    assert "break-inside: avoid" in document
    assert "page-break-inside: avoid" in document
    assert " contact-row" not in document
    assert " body-text" not in document


def test_normalize_formatting_edge_cases():
    from client_api.services.resume_pdf.formatting import normalize_formatting, paper_viewport_dimensions
    
    normalized = normalize_formatting(
        {
            "pageSize": "invalid_page_size",
            "paperLayoutFormat": "invalid_density",
            "innerSectionGapFormat": "invalid_inner_density",
            "pageMarginPt": "not_a_number",
            "titleFontSize": None,
        }
    )
    # Checks fallbacks were applied
    assert normalized.page_size == "a4"
    assert normalized.layout_density == "standard"
    assert normalized.inner_density == "standard"
    assert normalized.page_margin_pt == 54.0
    assert normalized.title_font_size == 18.0

    # Test paper_viewport_dimensions
    dim_letter = paper_viewport_dimensions("Letter")
    assert "width" in dim_letter
    assert "height" in dim_letter
    
    dim_a4 = paper_viewport_dimensions("A4")
    assert "width" in dim_a4
    assert "height" in dim_a4

