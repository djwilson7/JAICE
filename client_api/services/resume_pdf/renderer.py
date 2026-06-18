from __future__ import annotations

import html
from typing import Any

from common.resume_render.spec import load_document_css, load_formatting_css

from .fonts import build_font_face_css
from .formatting import format_pt, format_px_from_pt, normalize_formatting
from .model import build_resume_render_model

DOCUMENT_CSS = load_document_css()
FORMATTING_CSS = load_formatting_css()


def _safe(value: Any) -> str:
    return html.escape(str(value or "").strip())


def _separator(value: str = "&bull;") -> str:
    return f"<span class='resume-document__separator'>{value}</span>"


def _contact_html(rows: list[list[str]]) -> str:
    if not rows:
        return ""
    rendered_rows = []
    for row in rows:
        items = []
        for index, item in enumerate(row):
            if index:
                items.append(_separator())
            items.append(f"<span>{_safe(item)}</span>")
        rendered_rows.append(
            "<div class='resume-document__contact-row'>"
            f"{''.join(items)}</div>"
        )
    return (
        "<div class='resume-document__contact-strip resume-font--contact'>"
        f"{''.join(rendered_rows)}</div>"
    )


def _meta_row_html(meta: list[dict[str, str]], dates: list[str], has_bullets: bool = False) -> str:
    if not meta and not dates:
        return ""
    meta_items = []
    for index, field in enumerate(meta):
        if index:
            meta_items.append(_separator("|"))
        tone = field["tone"]
        meta_items.append(
            f"<span class='resume-document__meta-field resume-document__meta-field--{tone} "
            f"resume-font--subheading'>{_safe(field['value'])}</span>"
        )
    date_items = []
    for index, date in enumerate(dates):
        if index:
            date_items.append(_separator("-"))
        date_items.append(
            f"<span class='resume-document__date-field resume-font--subheading'>{_safe(date)}</span>"
        )
    modifier = " resume-document__meta-row--with-bullets" if has_bullets else ""
    return (
        f"<div class='resume-document__meta-row resume-font--subheading{modifier}'>"
        "<div class='resume-document__meta-fields'>"
        f"{''.join(meta_items)}</div>"
        "<div class='resume-document__date-fields'>"
        f"{''.join(date_items)}</div></div>"
    )


def _bullet_stack_html(bullets: list[dict[str, str]], education: bool = False) -> str:
    if not bullets:
        return ""
    modifier = " resume-document__bullet-stack--education" if education else ""
    rows = "".join(
        "<div class='resume-document__bullet-row resume-diagnostic-bullet-row' "
        "data-resume-diagnostic='bullet-row'>"
        "<span class='resume-document__bullet-marker resume-font--body'>&bull;</span>"
        f"<div class='resume-document__body resume-document__bullet-text resume-font--body'>{_safe(item['text'])}</div>"
        "</div>"
        for item in bullets
    )
    return f"<div class='resume-document__bullet-stack{modifier}'>{rows}</div>"


def _document_body(model: dict[str, Any]) -> str:
    sections = [
        "<section class='resume-document__section' data-section='header'>"
        f"<h1 class='resume-document__title resume-font--title'>{_safe(model['fullName'])}</h1>"
        f"{_contact_html(model['contactRows'])}</section>"
    ]

    summary = model["summary"]
    if summary:
        sections.append(
            "<section class='resume-document__section' data-section='summary'>"
            f"<h2 class='resume-document__section-title resume-font--heading'>{_safe(summary['title'])}</h2>"
            f"<p class='resume-document__body resume-font--body'>{_safe(summary['text'])}</p>"
            "</section>"
        )

    if model["experience"]:
        items = []
        for experience in model["experience"]:
            items.append(
                "<article class='resume-document__item'>"
                f"{_meta_row_html(experience['meta'], experience['dates'], bool(experience['bullets']))}"
                f"{_bullet_stack_html(experience['bullets'])}</article>"
            )
        sections.append(
            "<section class='resume-document__section' data-section='experience'>"
            f"<h2 class='resume-document__section-title resume-font--heading'>{_safe(model['experience'][0]['title'])}</h2>"
            "<div class='resume-document__item-stack'>"
            f"{''.join(items)}</div></section>"
        )

    if model["education"]:
        items = []
        for education in model["education"]:
            items.append(
                "<article class='resume-document__item'>"
                f"{_meta_row_html(education['meta'], education['dates'])}"
                f"{_bullet_stack_html(education['details'], education=True)}</article>"
            )
        sections.append(
            "<section class='resume-document__section' data-section='education'>"
            f"<h2 class='resume-document__section-title resume-font--heading'>{_safe(model['education'][0]['title'])}</h2>"
            "<div class='resume-document__item-stack'>"
            f"{''.join(items)}</div></section>"
        )

    if model["skills"]:
        rows = []
        for skill in model["skills"]:
            category = _safe(skill["category"])
            rows.append(
                "<div class='resume-document__skill-row resume-font--body'>"
                + (
                    f"<strong class='resume-document__skill-category resume-font--subheading'>{category}</strong>"
                    "<span class='resume-document__skill-colon'>:</span>"
                    if category else ""
                )
                + f"<span class='resume-document__skill-items resume-font--body'>{_safe(', '.join(skill['items']))}</span>"
                "</div>"
            )
        sections.append(
            "<section class='resume-document__section' data-section='skills'>"
            f"<h2 class='resume-document__section-title resume-font--heading'>{_safe(model['skills'][0]['title'])}</h2>"
            "<div class='resume-document__skill-stack'>"
            f"{''.join(rows)}</div></section>"
        )
    return "".join(sections)


def _document_variables(formatting: Any) -> str:
    normalized = normalize_formatting(formatting)
    variables = {
        "--resume-title-font-size-pt": f"{normalized.title_font_size:g}",
        "--resume-header-font-size-pt": f"{normalized.header_font_size:g}",
        "--resume-subheader-font-size-pt": f"{normalized.sub_header_font_size:g}",
        "--resume-body-font-size-pt": f"{normalized.body_font_size:g}",
        "--resume-page-margin-pt": f"{normalized.page_margin_pt:g}",
        "--resume-section-gap-pt": f"{normalized.section_gap_pt:g}",
        "--resume-inner-section-gap-pt": f"{normalized.inner_section_gap_pt:g}",
        "--resume-title-font-size": format_px_from_pt(normalized.title_font_size),
        "--resume-header-font-size": format_px_from_pt(normalized.header_font_size),
        "--resume-subheader-font-size": format_px_from_pt(normalized.sub_header_font_size),
        "--resume-body-font-size": format_px_from_pt(normalized.body_font_size),
        "--resume-section-gap": format_px_from_pt(normalized.section_gap_pt),
        "--resume-inner-section-gap": format_px_from_pt(normalized.inner_section_gap_pt),
        "--resume-title-line-height": f"{normalized.title_line_height:g}",
        "--resume-header-line-height": f"{normalized.header_line_height:g}",
        "--resume-subheader-line-height": f"{normalized.sub_header_line_height:g}",
        "--resume-body-line-height": f"{normalized.body_line_height:g}",
        "--resume-line-height": f"{normalized.body_line_height:g}",
        "--resume-page-margin": format_px_from_pt(normalized.page_margin_pt),
    }
    return "\n".join(f"{name}: {value};" for name, value in variables.items())


def render_resume_pdf_html(
    payload: Any,
    document_title: str | None = None,
) -> tuple[str, str, str, str, float]:
    formatting = getattr(payload, "formatting", None)
    if isinstance(payload, dict):
        formatting = payload.get("formatting")
    normalized = normalize_formatting(formatting)
    model = build_resume_render_model(payload)
    css = f"""
        {build_font_face_css()}
        @page {{ size: {normalized.page_name}; margin: {format_pt(normalized.page_margin_pt)}; }}
        html, body {{
            {_document_variables(formatting)}
            margin: 0;
            padding: 0;
            background: #fff;
            color: #0f172a;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }}
        * {{ box-sizing: border-box; }}
        body {{
            font-family: var(--resume-font-family);
            font-size: var(--resume-body-font-size);
            line-height: var(--resume-body-line-height);
        }}
        .page {{ width: 100%; min-height: 100%; padding: 0; background: #fff; overflow: visible; }}
        {FORMATTING_CSS}
        {DOCUMENT_CSS}
    """
    title = _safe(document_title or model["fullName"] or "resume")
    document = f"""<!doctype html>
<html>
<head>
    <meta charset="utf-8" />
    <title>{title}</title>
    <style>{css}</style>
</head>
<body>
    <main class="page resume-formatting-context resume-document" data-resume-document-surface="pdf"
          data-resume-layout-density="{normalized.layout_density}"
          data-resume-inner-density="{normalized.inner_density}">
        {_document_body(model)}
    </main>
</body>
</html>"""
    return (
        document,
        normalized.page_width,
        normalized.page_height,
        normalized.page_name,
        normalized.page_margin_pt,
    )
