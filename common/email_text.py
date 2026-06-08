from __future__ import annotations

import re
from dataclasses import dataclass
from html import unescape
from html.parser import HTMLParser
from typing import List, Optional, Tuple


@dataclass(frozen=True)
class EmailBodyCleanupResult:
    text: str
    content_type_used: str
    raw_text_length: int
    cleaned_text_length: int
    html_nodes_removed: int = 0
    boilerplate_lines_removed: int = 0
    preview: str = ""


_HTML_MARKUP_RE = re.compile(r"</?[a-z][\s\S]*>", re.IGNORECASE)
_URL_RE = re.compile(r"\b(?:https?://|www\.)[^\s<>'\")\]]+", re.IGNORECASE)

_BOILERPLATE_LINE_PATTERNS = (
    re.compile(r"\bview (?:this )?email in (?:your )?browser\b", re.IGNORECASE),
    re.compile(r"\bview in browser\b", re.IGNORECASE),
    re.compile(r"\bmanage (?:your )?preferences\b", re.IGNORECASE),
    re.compile(r"\bupdate (?:your )?preferences\b", re.IGNORECASE),
    re.compile(r"\bemail preferences\b", re.IGNORECASE),
    re.compile(r"\bunsubscribe\b", re.IGNORECASE),
    re.compile(r"\bprivacy policy\b", re.IGNORECASE),
    re.compile(r"\bterms of (?:use|service)\b", re.IGNORECASE),
    re.compile(r"\bthis email was sent to\b", re.IGNORECASE),
    re.compile(r"\bdo not reply\b", re.IGNORECASE),
    re.compile(r"\ball rights reserved\b", re.IGNORECASE),
    re.compile(r"\bfollow us on\b", re.IGNORECASE),
    re.compile(r"\bdownload (?:the|our) app\b", re.IGNORECASE),
    re.compile(r"^\s*(?:copyright\s+)?(?:\(c\)|©)\s*20\d{2}\b", re.IGNORECASE),
)


def normalize_plain_text(text: str) -> str:
    lines = [
        re.sub(r"[ \t\f\v]+", " ", line).strip()
        for line in unescape(str(text or "")).replace("\r\n", "\n").replace("\r", "\n").split("\n")
    ]
    return _join_normalized_lines(lines)


def collapse_plain_text(text: str) -> str:
    return re.sub(r"\s+", " ", unescape(str(text or ""))).strip()


def strip_email_boilerplate(text: str) -> tuple[str, int]:
    kept_lines: List[str] = []
    removed = 0

    for line in normalize_plain_text(text).splitlines():
        if _is_boilerplate_line(line):
            removed += 1
            continue
        kept_lines.append(line)

    return _join_normalized_lines(kept_lines), removed


def clean_email_body(
    body: str,
    content_type: str = "text/plain",
    *,
    return_debug: bool = False,
) -> str | EmailBodyCleanupResult:
    raw = str(body or "")
    normalized_content_type = str(content_type or "").lower()
    looks_like_html = "html" in normalized_content_type or bool(_HTML_MARKUP_RE.search(raw))

    if looks_like_html:
        result = clean_email_html(raw, return_debug=True)
    else:
        plain = normalize_plain_text(_remove_urls(raw))
        cleaned, boilerplate_removed = strip_email_boilerplate(plain)
        result = EmailBodyCleanupResult(
            text=cleaned,
            content_type_used="text/plain",
            raw_text_length=len(raw),
            cleaned_text_length=len(cleaned),
            boilerplate_lines_removed=boilerplate_removed,
            preview=_preview(cleaned),
        )

    return result if return_debug else result.text


def clean_email_html(
    html: str,
    *,
    return_debug: bool = False,
) -> str | EmailBodyCleanupResult:
    result = html_to_clean_text(html, return_debug=True)
    return result if return_debug else result.text


def html_to_clean_text(
    html: str,
    *,
    return_debug: bool = False,
) -> str | EmailBodyCleanupResult:
    raw = str(html or "")
    extractor = _EmailHTMLToTextExtractor()
    extractor.feed(raw)
    extractor.close()

    extracted = normalize_plain_text(_remove_urls(extractor.text()))
    cleaned, boilerplate_removed = strip_email_boilerplate(extracted)
    result = EmailBodyCleanupResult(
        text=cleaned,
        content_type_used="text/html",
        raw_text_length=len(raw),
        cleaned_text_length=len(cleaned),
        html_nodes_removed=extractor.nodes_removed,
        boilerplate_lines_removed=boilerplate_removed,
        preview=_preview(cleaned),
    )
    return result if return_debug else result.text


class _EmailHTMLToTextExtractor(HTMLParser):
    _BLOCK_TAGS = {
        "address",
        "article",
        "aside",
        "blockquote",
        "br",
        "div",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "li",
        "main",
        "ol",
        "p",
        "pre",
        "section",
        "table",
        "tr",
        "ul",
    }
    _INLINE_SPACED_TAGS = {"td", "th"}
    _SKIP_SUBTREE_TAGS = {
        "button",
        "canvas",
        "footer",
        "form",
        "head",
        "header",
        "iframe",
        "link",
        "meta",
        "nav",
        "noscript",
        "script",
        "select",
        "style",
        "svg",
        "title",
    }
    _IGNORE_SINGLE_TAGS = {"img", "input", "option"}
    _VOID_TAGS = {
        "area",
        "base",
        "br",
        "col",
        "embed",
        "hr",
        "img",
        "input",
        "link",
        "meta",
        "source",
        "track",
        "wbr",
    }
    _PRUNED_ATTRIBUTE_TOKENS = {
        "advertisement",
        "app-store",
        "banner",
        "email-preheader",
        "footer",
        "header",
        "hidden",
        "icon",
        "legal",
        "logo",
        "nav",
        "play-store",
        "preference",
        "preferences",
        "preheader",
        "preview",
        "privacy",
        "promo",
        "social",
        "terms",
        "tracking",
        "unsubscribe",
    }

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self._parts: List[str] = []
        self._skip_depth = 0
        self._body_depth = 0
        self._seen_body = False
        self.nodes_removed = 0

    def handle_starttag(self, tag: str, attrs: List[Tuple[str, Optional[str]]]) -> None:
        tag = tag.lower()

        if tag == "body":
            self._seen_body = True
            self._body_depth += 1

        if self._skip_depth:
            if tag not in self._VOID_TAGS:
                self._skip_depth += 1
            self.nodes_removed += 1
            return

        if tag in self._IGNORE_SINGLE_TAGS:
            self.nodes_removed += 1
            return

        if tag in self._SKIP_SUBTREE_TAGS or self._should_prune(attrs):
            self._skip_depth += 1
            self.nodes_removed += 1
            return

        if not self._in_likely_body():
            return

        if tag in self._BLOCK_TAGS:
            self._append_line_break()
            if tag == "li":
                self._parts.append("- ")
        elif tag in self._INLINE_SPACED_TAGS:
            self._append_space()

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()

        if self._skip_depth:
            self._skip_depth -= 1
            if tag == "body" and self._body_depth:
                self._body_depth -= 1
            return

        if self._in_likely_body() and tag in self._BLOCK_TAGS:
            self._append_line_break()
        elif self._in_likely_body() and tag in self._INLINE_SPACED_TAGS:
            self._append_space()

        if tag == "body" and self._body_depth:
            self._body_depth -= 1

    def handle_data(self, data: str) -> None:
        if not self._skip_depth and self._in_likely_body() and data:
            self._parts.append(data)

    def _should_prune(self, attrs: List[Tuple[str, Optional[str]]]) -> bool:
        attr_map = {str(key or "").lower(): str(value or "").lower() for key, value in attrs}
        if "hidden" in attr_map or attr_map.get("aria-hidden") == "true":
            return True

        style = re.sub(r"\s+", "", attr_map.get("style", ""))
        if any(signal in style for signal in ("display:none", "visibility:hidden", "opacity:0")):
            return True
        if re.search(r"(?:^|;)width:0(?:px)?(?:;|$)", style):
            return True
        if re.search(r"(?:^|;)height:0(?:px)?(?:;|$)", style):
            return True

        marker_text = " ".join(
            value
            for key, value in attr_map.items()
            if key in {"aria-label", "class", "id", "role"}
        )
        return any(token in marker_text for token in self._PRUNED_ATTRIBUTE_TOKENS)

    def _in_likely_body(self) -> bool:
        return not self._seen_body or self._body_depth > 0

    def _append_space(self) -> None:
        if self._parts and not self._parts[-1].endswith((" ", "\n")):
            self._parts.append(" ")

    def _append_line_break(self) -> None:
        if self._parts and not self._parts[-1].endswith("\n"):
            self._parts.append("\n")

    def text(self) -> str:
        return "".join(self._parts)


def html_to_plain_text(value: str) -> str:
    return str(html_to_clean_text(value))


def html_or_text_to_plain_text(value: str) -> str:
    return str(clean_email_body(value))


def _is_boilerplate_line(line: str) -> bool:
    normalized = line.strip()
    if not normalized:
        return False
    if _is_artifact_line(normalized):
        return True
    return any(pattern.search(normalized) for pattern in _BOILERPLATE_LINE_PATTERNS)


def _is_artifact_line(line: str) -> bool:
    normalized = line.strip()
    if re.fullmatch(r"[-_*=•·]+", normalized):
        return True
    return bool(
        re.fullmatch(
            r"(?:[A-Z][\w&'.-]*(?:\s+[A-Z][\w&'.-]*){0,4}\s+)?(?:logo|icon)",
            normalized,
            flags=re.IGNORECASE,
        )
    )


def _remove_urls(text: str) -> str:
    without_urls = _URL_RE.sub("", str(text or ""))
    return _remove_empty_link_artifacts(without_urls)


def _remove_empty_link_artifacts(text: str) -> str:
    previous = None
    cleaned = str(text or "")
    while previous != cleaned:
        previous = cleaned
        cleaned = re.sub(r"\[\s*\]\s*\(\s*\)", "", cleaned)
        cleaned = re.sub(r"\(\s*\)", "", cleaned)
        cleaned = re.sub(r"\[\s*\]", "", cleaned)
    return cleaned


def _join_normalized_lines(lines: List[str]) -> str:
    output: List[str] = []
    previous_blank = False
    for line in lines:
        normalized = line.strip()
        if not normalized:
            if output and not previous_blank:
                output.append("")
            previous_blank = True
            continue
        output.append(normalized)
        previous_blank = False
    while output and output[-1] == "":
        output.pop()
    return "\n".join(output).strip()


def _preview(text: str) -> str:
    return collapse_plain_text(text)[:160]
