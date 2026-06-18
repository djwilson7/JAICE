from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .formatting import format_pt, paper_viewport_dimensions
from .renderer import render_resume_pdf_html


class PlaywrightUnavailableError(RuntimeError):
    pass


@dataclass(frozen=True)
class GeneratedResumePdf:
    pdf_bytes: bytes
    filename: str
    page_name: str
    page_width: str
    page_height: str
    page_margin_pt: float


def safe_pdf_filename(document_title: str) -> str:
    stem = "".join(
        character if character.isalnum() or character in {"-", "_"} else "_"
        for character in document_title.strip()
    ).strip("_") or "resume"
    return f"{stem}.pdf"


async def generate_resume_pdf(
    payload: Any,
    document_title: str,
    *,
    debug_enabled: bool = False,
    debug_dir: Path | None = None,
    logger: Any = None,
) -> GeneratedResumePdf:
    try:
        from playwright.async_api import async_playwright
    except ImportError as error:
        raise PlaywrightUnavailableError(
            "Playwright is not installed for the client API service."
        ) from error

    filename = safe_pdf_filename(document_title)
    document_html, page_width, page_height, page_name, page_margin_pt = (
        render_resume_pdf_html(payload, filename)
    )
    viewport = paper_viewport_dimensions(page_name)

    if debug_enabled and debug_dir:
        debug_dir.mkdir(parents=True, exist_ok=True)
        (debug_dir / "resume-export.html").write_text(document_html, encoding="utf-8")
        if logger:
            logger.info(
                "Resume PDF page model: "
                f"{page_name} {page_width}x{page_height}, "
                f"viewport={viewport['width']}x{viewport['height']}, "
                f"css_page_margin={format_pt(page_margin_pt)}, playwright_pdf_margin=0"
            )

    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage"],
        )
        try:
            page = await browser.new_page(viewport=viewport, device_scale_factor=1)
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
            if debug_enabled and debug_dir:
                screenshot_path = debug_dir / "resume-before-pdf.png"
                await page.screenshot(path=str(screenshot_path), full_page=True)
                metrics = await page.evaluate(
                    """() => ({
                        viewport: { width: window.innerWidth, height: window.innerHeight },
                        bodyScrollHeight: document.body.scrollHeight,
                        pageCountEstimate: Math.max(
                            1,
                            Math.ceil(document.body.scrollHeight / window.innerHeight)
                        )
                    })"""
                )
                (debug_dir / "resume-render-metrics.json").write_text(
                    json.dumps(metrics, indent=2, default=str),
                    encoding="utf-8",
                )
                if logger:
                    logger.info(f"Resume PDF debug metrics: {json.dumps(metrics, default=str)}")
            pdf_bytes = await page.pdf(**pdf_options)
        finally:
            await browser.close()

    return GeneratedResumePdf(
        pdf_bytes=pdf_bytes,
        filename=filename,
        page_name=page_name,
        page_width=page_width,
        page_height=page_height,
        page_margin_pt=page_margin_pt,
    )
