from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Any


ASSET_ROOT = Path(__file__).resolve().parent


def _require_mapping(value: Any, label: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ValueError(f"{label} must be an object")
    return value


@lru_cache(maxsize=1)
def load_render_spec() -> dict[str, Any]:
    raw = json.loads((ASSET_ROOT / "render_spec.json").read_text(encoding="utf-8"))
    spec = _require_mapping(raw, "resume render spec")
    for key in ("version", "defaults", "limits", "paperSizes", "densityNames"):
        if key not in spec:
            raise ValueError(f"resume render spec is missing {key}")
    for page_size in ("a4", "letter"):
        _require_mapping(spec["paperSizes"].get(page_size), f"paperSizes.{page_size}")
    if spec["densityNames"] != ["compact", "standard", "relaxed"]:
        raise ValueError("resume render spec has invalid density names")
    return spec


@lru_cache(maxsize=1)
def load_document_css() -> str:
    css = (ASSET_ROOT / "document.css").read_text(encoding="utf-8").strip()
    if ".resume-document" not in css:
        raise ValueError("canonical resume document CSS is invalid")
    return css


@lru_cache(maxsize=1)
def load_formatting_css() -> str:
    css = (ASSET_ROOT / "formatting.css").read_text(encoding="utf-8").strip()
    if "--resume-default-body-font-size-pt" not in css:
        raise ValueError("canonical resume formatting CSS is invalid")
    return css


@lru_cache(maxsize=1)
def load_formatting_tokens() -> dict[str, float]:
    css = load_formatting_css()
    tokens = {
        name: float(value)
        for name, value in re.findall(r"--([a-z0-9-]+)\s*:\s*(-?\d+(?:\.\d+)?)\s*;", css)
    }
    required = (
        "resume-default-title-font-size-pt",
        "resume-default-header-font-size-pt",
        "resume-default-subheader-font-size-pt",
        "resume-default-body-font-size-pt",
        "resume-default-page-margin-pt",
    )
    missing = [name for name in required if name not in tokens]
    if missing:
        raise ValueError(f"resume formatting CSS is missing tokens: {', '.join(missing)}")
    return tokens


@lru_cache(maxsize=1)
def load_render_fixtures() -> dict[str, Any]:
    fixtures = json.loads((ASSET_ROOT / "fixtures" / "render_models.json").read_text(encoding="utf-8"))
    value = _require_mapping(fixtures, "resume render fixtures")
    if not isinstance(value.get("cases"), list):
        raise ValueError("resume render fixtures must contain cases")
    return value
