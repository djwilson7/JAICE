from __future__ import annotations

import base64
from pathlib import Path


def _font_data_uri(path: Path) -> str | None:
    try:
        return f"data:font/ttf;base64,{base64.b64encode(path.read_bytes()).decode('ascii')}"
    except FileNotFoundError:
        return None


def build_font_face_css() -> str:
    root = Path(__file__).resolve().parents[3]
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
        if data_uri:
            rules.append(
                "@font-face { "
                f"font-family: '{family}'; "
                f"src: url('{data_uri}') format('truetype'); "
                f"font-weight: {weight}; font-style: {style}; font-display: block; "
                "}"
            )
    return "\n".join(rules)
