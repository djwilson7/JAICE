from __future__ import annotations

from typing import Any


DEFAULT_SECTION_TITLES = {
    "summary": "Professional Summary",
    "experience": "Work Experience",
    "education": "Education",
    "skills": "Skills",
}


def _read(value: Any, key: str, fallback: Any = None) -> Any:
    if isinstance(value, dict):
        return value.get(key, fallback)
    return getattr(value, key, fallback)


def _text(value: Any) -> str:
    return str(value or "").strip()


def _items(value: Any, key: str) -> list[Any]:
    result = _read(value, key, [])
    return list(result or [])


def _section_title(payload: Any, section: str) -> str:
    titles = _read(payload, "sectionTitles", {})
    return _text(_read(titles, section)) or DEFAULT_SECTION_TITLES[section]


def _contact_rows(payload: Any) -> list[list[str]]:
    hidden = set(_items(payload, "hiddenContactFields"))
    contact_items = [
        _text(_read(payload, key))
        for key in ("location", "phone", "email", "linkedin", "website", "github")
        if key not in hidden
    ]
    contact_items.extend(
        _text(_read(field, "value"))
        for field in _items(payload, "customContact")
    )
    filtered = [item for item in contact_items if item]
    return [filtered[index:index + 3] for index in range(0, len(filtered), 3)]


def _bold_ranges(bullet: Any, raw_text: str) -> list[dict[str, int]]:
    leading = len(raw_text) - len(raw_text.lstrip())
    trimmed_length = len(raw_text.strip())
    ranges = []
    for value in _items(bullet, "boldRanges"):
        try:
            start = max(0, min(trimmed_length, int(_read(value, "start")) - leading))
            end = max(0, min(trimmed_length, int(_read(value, "end")) - leading))
        except (TypeError, ValueError):
            continue
        if start < end:
            ranges.append({"start": start, "end": end})
    ranges.sort(key=lambda item: (item["start"], item["end"]))
    merged: list[dict[str, int]] = []
    for value in ranges:
        if merged and value["start"] <= merged[-1]["end"]:
            merged[-1]["end"] = max(merged[-1]["end"], value["end"])
        else:
            merged.append(value)
    return merged


def _bullets(value: Any, key: str) -> list[dict[str, Any]]:
    result = []
    for bullet in _items(value, key):
        raw_text = str(_read(bullet, "text") or "")
        text = raw_text.strip()
        if not text:
            continue
        bold_ranges = _bold_ranges(bullet, raw_text)
        result.append({
            "id": _text(_read(bullet, "id")),
            "text": text,
            **({"boldRanges": bold_ranges} if bold_ranges else {}),
        })
    return result


def build_resume_render_model(payload: Any) -> dict[str, Any]:
    experience = []
    for index, item in enumerate(_items(payload, "experience")):
        meta = [
            {"value": _text(_read(item, "jobTitle")), "tone": "primary"},
            {"value": _text(_read(item, "company")), "tone": "secondary"},
            {"value": _text(_read(item, "location")), "tone": "tertiary"},
        ]
        meta = [field for field in meta if field["value"]]
        dates = [
            value
            for value in (
                _text(_read(item, "startDate")),
                _text(_read(item, "endDate")),
            )
            if value
        ]
        bullets = _bullets(item, "bullets")
        if not meta and not dates and not bullets:
            continue
        experience.append({
            "id": _text(_read(item, "id")) or f"experience-{index}",
            "title": _section_title(payload, "experience"),
            "meta": meta,
            "dates": dates,
            "bullets": bullets,
        })

    education = []
    for index, item in enumerate(_items(payload, "education")):
        meta = [
            {"value": _text(_read(item, "degree")), "tone": "primary"},
            {"value": _text(_read(item, "school")), "tone": "secondary"},
        ]
        meta = [field for field in meta if field["value"]]
        dates = [
            value
            for value in (
                _text(_read(item, "startDate")),
                _text(_read(item, "endDate")),
            )
            if value
        ]
        details = _bullets(item, "details")
        if not meta and not dates and not details:
            continue
        education.append({
            "id": _text(_read(item, "id")) or f"education-{index}",
            "title": _section_title(payload, "education"),
            "meta": meta,
            "dates": dates,
            "details": details,
        })

    skills = []
    for index, item in enumerate(_items(payload, "skills")):
        category = _text(_read(item, "category"))
        skill_items = [_text(value) for value in _items(item, "items")]
        skill_items = [value for value in skill_items if value]
        if not category and not skill_items:
            continue
        skills.append({
            "id": _text(_read(item, "id")) or f"skill-{index}",
            "title": _section_title(payload, "skills"),
            "category": category,
            "items": skill_items,
        })

    summary_text = _text(_read(payload, "summary"))
    return {
        "fullName": _text(_read(payload, "fullName")) or "Your Name",
        "contactRows": _contact_rows(payload),
        "summary": {
            "title": _section_title(payload, "summary"),
            "text": summary_text,
        } if summary_text else None,
        "experience": experience,
        "education": education,
        "skills": skills,
    }
