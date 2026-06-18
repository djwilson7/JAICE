from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from common.resume_render.spec import load_formatting_tokens, load_render_spec

RESUME_RENDER_SPEC = load_render_spec()
RESUME_FORMATTING_TOKENS = load_formatting_tokens()


@dataclass(frozen=True)
class NormalizedResumeFormatting:
    page_size: str
    page_width: str
    page_height: str
    page_name: str
    page_margin_pt: float
    title_font_size: float
    header_font_size: float
    sub_header_font_size: float
    body_font_size: float
    title_line_height: float
    header_line_height: float
    sub_header_line_height: float
    body_line_height: float
    section_gap_pt: float
    inner_section_gap_pt: float
    layout_density: str
    inner_density: str


def _read(value: Any, key: str, fallback: Any = None) -> Any:
    if isinstance(value, dict):
        return value.get(key, fallback)
    return getattr(value, key, fallback)


def _number(value: Any, minimum: float, maximum: float, fallback: float) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        number = fallback
    return max(minimum, min(maximum, number))


def normalize_formatting(formatting: Any) -> NormalizedResumeFormatting:
    spec = RESUME_RENDER_SPEC
    defaults = spec["defaults"]
    limits = spec["limits"]
    css_defaults = {
        "titleFontSize": RESUME_FORMATTING_TOKENS["resume-default-title-font-size-pt"],
        "headerFontSize": RESUME_FORMATTING_TOKENS["resume-default-header-font-size-pt"],
        "subHeaderFontSize": RESUME_FORMATTING_TOKENS["resume-default-subheader-font-size-pt"],
        "bodyFontSize": RESUME_FORMATTING_TOKENS["resume-default-body-font-size-pt"],
        "pageMarginPt": RESUME_FORMATTING_TOKENS["resume-default-page-margin-pt"],
    }

    page_size = _read(formatting, "pageSize", defaults["pageSize"])
    if page_size not in spec["paperSizes"]:
        page_size = defaults["pageSize"]
    paper = spec["paperSizes"][page_size]

    density_name = _read(formatting, "paperLayoutFormat", defaults["paperLayoutFormat"])
    if density_name not in spec["densityNames"]:
        density_name = defaults["paperLayoutFormat"]
    def density_token(density: str, suffix: str) -> float:
        return RESUME_FORMATTING_TOKENS[f"resume-{density}-{suffix}"]

    inner_density_name = _read(formatting, "innerSectionGapFormat", defaults["innerSectionGapFormat"])
    if inner_density_name not in spec["densityNames"]:
        inner_density_name = defaults["innerSectionGapFormat"]

    return NormalizedResumeFormatting(
        page_size=page_size,
        page_width=paper["cssWidth"],
        page_height=paper["cssHeight"],
        page_name=paper["printName"],
        page_margin_pt=_number(
            _read(formatting, "pageMarginPt", css_defaults["pageMarginPt"]),
            *limits["pageMarginPt"],
            css_defaults["pageMarginPt"],
        ),
        title_font_size=_number(
            _read(formatting, "titleFontSize", css_defaults["titleFontSize"]),
            *limits["titleFontSize"],
            css_defaults["titleFontSize"],
        ),
        header_font_size=_number(
            _read(formatting, "headerFontSize", css_defaults["headerFontSize"]),
            *limits["headerFontSize"],
            css_defaults["headerFontSize"],
        ),
        sub_header_font_size=_number(
            _read(formatting, "subHeaderFontSize", css_defaults["subHeaderFontSize"]),
            *limits["subHeaderFontSize"],
            css_defaults["subHeaderFontSize"],
        ),
        body_font_size=_number(
            _read(formatting, "bodyFontSize", css_defaults["bodyFontSize"]),
            *limits["bodyFontSize"],
            css_defaults["bodyFontSize"],
        ),
        title_line_height=density_token(density_name, "title-line-height"),
        header_line_height=density_token(density_name, "header-line-height"),
        sub_header_line_height=density_token(density_name, "subheader-line-height"),
        body_line_height=density_token(density_name, "body-line-height"),
        section_gap_pt=density_token(density_name, "section-gap-pt"),
        inner_section_gap_pt=density_token(inner_density_name, "inner-section-gap-pt"),
        layout_density=density_name,
        inner_density=inner_density_name,
    )


def format_pt(value: float) -> str:
    return f"{value:g}pt"


def format_px_from_pt(value: float) -> str:
    return f"{value * 96 / 72:g}px"


def paper_viewport_dimensions(page_name: str) -> dict[str, int]:
    spec = RESUME_RENDER_SPEC
    page_size = "letter" if page_name == "Letter" else "a4"
    paper = spec["paperSizes"][page_size]
    return {
        "width": round(paper["widthPt"] * 96 / 72),
        "height": round(paper["heightPt"] * 96 / 72),
    }
