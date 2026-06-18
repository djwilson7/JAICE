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


def _bullets(value: Any, key: str) -> list[dict[str, str]]:
    return [
        {
            "id": _text(_read(bullet, "id")),
            "text": _text(_read(bullet, "text")),
        }
        for bullet in _items(value, key)
        if _text(_read(bullet, "text"))
    ]


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
