
from __future__ import annotations

from dataclasses import dataclass
import re
from typing import Iterable

RULE_ACCEPT_THRESHOLD = 0.78
RULE_MARGIN_THRESHOLD = 0.18
JOB_SIGNAL_ACCEPT_THRESHOLD = 0.45
NOT_JOB_RELATED_THRESHOLD = 0.55

STAGES = ("applied", "interview", "offer", "accepted", "rejected")
# Later lifecycle events should override baseline application-received language.
# Example: "thank you for applying" + "schedule an interview" => interview, not applied.
DECISIVE_STAGE_PRIORITY = {
    "accepted": 5,
    "offer": 4,
    "interview": 3,
    "rejected": 3,
    "applied": 1,
}
BASELINE_APPLIED_CATEGORIES = {"APPLICATION_RECEIVED", "APPLICATION_UPDATE"}
SCORE_NORMALIZER = 10.0

STRONG = 5.0
MEDIUM = 3.0
WEAK = 1.5
TINY = 0.75

SUBJECT_MULTIPLIER = 1.35
SENDER_MULTIPLIER = 1.10
BODY_MULTIPLIER = 1.00
FULL_TEXT_MULTIPLIER = 0.55

INTERNAL_TO_STAGE = {
    "APPLICATION_RECEIVED": "applied",
    "APPLICATION_UPDATE": "applied",
    "ASSESSMENT": "applied",
    "INTERVIEW": "interview",
    "OFFER": "offer",
    "ACCEPTED": "accepted",
    "REJECTION": "rejected",
}

STAGE_TO_DEFAULT_CATEGORY = {
    "applied": "APPLICATION_RECEIVED",
    "interview": "INTERVIEW",
    "offer": "OFFER",
    "accepted": "ACCEPTED",
    "rejected": "REJECTION",
}

APPLICATION_LIFECYCLE_CATEGORIES = frozenset(INTERNAL_TO_STAGE.keys())

FIELD_MULTIPLIERS = {
    "subject": SUBJECT_MULTIPLIER,
    "sender": SENDER_MULTIPLIER,
    "body": BODY_MULTIPLIER,
    "email_text": BODY_MULTIPLIER,
    "full_text": FULL_TEXT_MULTIPLIER,
}


@dataclass(frozen=True)
class EmailContext:
    subject: str
    sender: str
    body: str
    email_text: str
    full_text: str


@dataclass(frozen=True)
class Rule:
    phrase: str
    target: str
    weight: float
    fields: tuple[str, ...] = ("subject", "body", "email_text")
    kind: str = "phrase"
    category: str | None = None
    requires_any: tuple[str, ...] = ()
    excludes_any: tuple[str, ...] = ()
    hard: bool = False


@dataclass(frozen=True)
class Match:
    target: str
    rule: str
    weight: float
    kind: str
    field: str | None = None
    category: str | None = None
    hard: bool = False
    requires_any: tuple[str, ...] = ()
    excludes_any: tuple[str, ...] = ()


def _normalize(value: str | None) -> str:
    text = str(value or "").lower()
    text = re.sub(r"https?://\S+", " ", text)
    text = re.sub(r"[\u200b-\u200f\ufeff]", "", text)
    text = re.sub(r"[^a-z0-9@._+\-'\s]", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _build_context(*, subject: str, sender: str, body: str, email_text: str) -> EmailContext:
    normalized_subject = _normalize(subject)
    normalized_sender = _normalize(sender)
    normalized_body = _normalize(body)
    normalized_email_text = _normalize(email_text)
    full_text = " ".join(
        part
        for part in (
            normalized_subject,
            normalized_sender,
            normalized_body,
            normalized_email_text,
        )
        if part
    )
    return EmailContext(
        subject=normalized_subject,
        sender=normalized_sender,
        body=normalized_body,
        email_text=normalized_email_text,
        full_text=full_text,
    )


def _contains_any(text: str, terms: Iterable[str]) -> bool:
    return any(term in text for term in terms)


def _contains_phrase(text: str, phrase: str) -> bool:
    return phrase in text


def _context_contains_any(ctx: EmailContext, terms: Iterable[str], fields: tuple[str, ...] = ("subject", "body", "email_text", "full_text")) -> bool:
    return any(_contains_any(getattr(ctx, field), terms) for field in fields)


def _field_text(ctx: EmailContext, field: str) -> str:
    return getattr(ctx, field)


def _blank_scores() -> dict:
    return {stage: 0.0 for stage in STAGES}


def _blank_category_scores() -> dict:
    return {category: 0.0 for category in (*APPLICATION_LIFECYCLE_CATEGORIES, "RECRUITER_OUTREACH", "NETWORKING", "FOLLOW_UP", "NOT_JOB_RELATED", "UNKNOWN")}


def _append_match(matched_rules: list, match: Match) -> None:
    matched_rules.append(
        {
            "stage": match.target,
            "rule": match.rule,
            "weight": round(match.weight, 4),
            "kind": match.kind,
            "field": match.field,
            "category": match.category,
            "hard": match.hard,
            "requires_any": tuple(match.requires_any),
            "excludes_any": tuple(match.excludes_any),
        }
    )


def _add_score(
    scores: dict,
    matched_rules: list,
    target: str,
    weight: float,
    rule: str,
    *,
    kind: str = "phrase",
    field: str | None = None,
    category: str | None = None,
    hard: bool = False,
    requires_any: tuple[str, ...] = (),
    excludes_any: tuple[str, ...] = (),
) -> None:
    scores[target] = scores.get(target, 0.0) + weight
    _append_match(
        matched_rules,
        Match(
            target=target,
            rule=rule,
            weight=weight,
            kind=kind,
            field=field,
            category=category,
            hard=hard,
            requires_any=requires_any,
            excludes_any=excludes_any,
        ),
    )


# Hard lifecycle phrases are specific enough to override weak marketing/footer noise.
HARD_LIFECYCLE_RULES: tuple[Rule, ...] = (
    Rule("thank you for applying", "applied", STRONG, category="APPLICATION_RECEIVED", hard=True),
    Rule("thank you for your application", "applied", STRONG, category="APPLICATION_RECEIVED", hard=True),
    Rule("we received your application", "applied", STRONG, category="APPLICATION_RECEIVED", hard=True),
    Rule("we have received your application", "applied", STRONG, category="APPLICATION_RECEIVED", hard=True),
    Rule("received your application", "applied", STRONG, category="APPLICATION_RECEIVED", hard=True),
    Rule("we recieved your application", "applied", STRONG, category="APPLICATION_RECEIVED", hard=True),
    Rule("your application has been received", "applied", STRONG, category="APPLICATION_RECEIVED", hard=True),
    Rule("your application has been recieved", "applied", STRONG, category="APPLICATION_RECEIVED", hard=True),
    Rule("application successfully submitted", "applied", STRONG, category="APPLICATION_RECEIVED", hard=True),
    Rule("application was successfully submitted", "applied", STRONG, category="APPLICATION_RECEIVED", hard=True),
    Rule("application has been successfully submitted", "applied", STRONG, category="APPLICATION_RECEIVED", hard=True),
    Rule("successfully submitted your application", "applied", STRONG, category="APPLICATION_RECEIVED", hard=True),
    Rule("application submitted", "applied", MEDIUM, category="APPLICATION_RECEIVED", hard=True, requires_any=("your", "successfully", "received", "submitted")),
    Rule("application confirmation", "applied", STRONG, category="APPLICATION_RECEIVED", hard=True),
    Rule("complete your assessment", "applied", STRONG, category="ASSESSMENT", hard=True),
    Rule("complete the assessment", "applied", STRONG, category="ASSESSMENT", hard=True),
    Rule("assessment link", "applied", STRONG, category="ASSESSMENT", hard=True),
    Rule("technical assessment", "applied", STRONG, category="ASSESSMENT", hard=True),
    Rule("coding challenge", "applied", STRONG, category="ASSESSMENT", hard=True),
    Rule("take home assessment", "applied", STRONG, category="ASSESSMENT", hard=True),
    Rule("take-home assessment", "applied", STRONG, category="ASSESSMENT", hard=True),
    Rule("interview invitation", "interview", STRONG, category="INTERVIEW", hard=True),
    Rule("schedule an interview", "interview", STRONG, category="INTERVIEW", hard=True),
    Rule("schedule your interview", "interview", STRONG, category="INTERVIEW", hard=True),
    Rule("availability for an interview", "interview", STRONG, category="INTERVIEW", hard=True),
    Rule("phone screen", "interview", STRONG, category="INTERVIEW", hard=True),
    Rule("video interview", "interview", STRONG, category="INTERVIEW", hard=True),
    Rule("interview confirmed", "interview", STRONG, category="INTERVIEW", hard=True),
    Rule("interview scheduled", "interview", STRONG, category="INTERVIEW", hard=True),
    Rule("offer letter", "offer", STRONG, category="OFFER", hard=True),
    Rule("employment offer", "offer", STRONG, category="OFFER", hard=True),
    Rule("formal offer", "offer", STRONG, category="OFFER", hard=True),
    Rule("we are pleased to offer", "offer", STRONG, category="OFFER", hard=True),
    Rule("pleased to offer", "offer", STRONG, category="OFFER", hard=True),
    Rule("we are excited to offer", "offer", STRONG, category="OFFER", hard=True),
    Rule("we're excited to offer", "offer", STRONG, category="OFFER", hard=True),
    Rule("extend an offer", "offer", STRONG, category="OFFER", hard=True),
    Rule("extending an offer", "offer", STRONG, category="OFFER", hard=True),
    Rule("offer accepted", "accepted", STRONG, category="ACCEPTED", hard=True),
    Rule("accepted your offer", "accepted", STRONG, category="ACCEPTED", hard=True),
    Rule("welcome aboard", "accepted", STRONG, category="ACCEPTED", hard=True),
    Rule("welcome to the team", "accepted", STRONG, category="ACCEPTED", hard=True),
    Rule("welcome to our team", "accepted", STRONG, category="ACCEPTED", hard=True),
    Rule("next steps for onboarding", "accepted", STRONG, category="ACCEPTED", hard=True),
    Rule("we're excited to have you join", "accepted", STRONG, category="ACCEPTED", hard=True),
    Rule("we are excited to have you join", "accepted", STRONG, category="ACCEPTED", hard=True),
    Rule("not moving forward", "rejected", STRONG, category="REJECTION", hard=True),
    Rule("will not be moving forward", "rejected", STRONG, category="REJECTION", hard=True),
    Rule("decided to pursue other candidates", "rejected", STRONG, category="REJECTION", hard=True),
    Rule("moving forward with other candidates", "rejected", STRONG, category="REJECTION", hard=True),
    Rule("move forward with other candidates", "rejected", STRONG, category="REJECTION", hard=True),
    Rule("chosen to move forward with other candidates", "rejected", STRONG, category="REJECTION", hard=True),
    Rule("chose to move forward with other candidates", "rejected", STRONG, category="REJECTION", hard=True),
    Rule("decided to move forward with candidates", "rejected", STRONG, category="REJECTION", hard=True),
    Rule("move forward with candidates whose", "rejected", STRONG, category="REJECTION", hard=True),
    Rule("not selected", "rejected", STRONG, category="REJECTION", hard=True, excludes_any=("if you are not selected", "if not selected", "if your qualifications")),
    Rule("we regret to inform", "rejected", STRONG, category="REJECTION", hard=True),
    Rule("position has been filled", "rejected", STRONG, category="REJECTION", hard=True),
    Rule("filled the position", "rejected", STRONG, category="REJECTION", hard=True),
    Rule("we have filled the position", "rejected", STRONG, category="REJECTION", hard=True),
    Rule("position is filled", "rejected", STRONG, category="REJECTION", hard=True),
    Rule("position has closed", "rejected", STRONG, category="REJECTION", hard=True),
    Rule("position is closed", "rejected", STRONG, category="REJECTION", hard=True),
    Rule("closing the role", "rejected", STRONG, category="REJECTION", hard=True),
    Rule("closing this role", "rejected", STRONG, category="REJECTION", hard=True),
    Rule("no longer accepting applications", "rejected", STRONG, category="REJECTION", hard=True),
    Rule("no longer open to new applications", "rejected", STRONG, category="REJECTION", hard=True),
    Rule("application rejected", "rejected", STRONG, category="REJECTION", hard=True),
    Rule("application unsuccessful", "rejected", STRONG, category="REJECTION", hard=True),
    Rule("application has expired", "rejected", STRONG, category="REJECTION", hard=True),
    Rule("application expired", "rejected", STRONG, category="REJECTION", hard=True),
    Rule("applications have expired", "rejected", STRONG, category="REJECTION", hard=True),
    Rule("applications to the following companies have expired", "rejected", STRONG, category="REJECTION", hard=True),
)

CONTEXTUAL_STAGE_RULES: tuple[Rule, ...] = (
    Rule("we'll review your application", "applied", MEDIUM, category="APPLICATION_RECEIVED"),
    Rule("we will review your application", "applied", MEDIUM, category="APPLICATION_RECEIVED"),
    Rule("application status", "applied", MEDIUM, category="APPLICATION_UPDATE", requires_any=("your", "update", "changed", "review")),
    Rule("update on your application", "applied", MEDIUM, category="APPLICATION_UPDATE"),
    Rule("update about your application", "applied", MEDIUM, category="APPLICATION_UPDATE"),
    Rule("update regarding your application", "applied", MEDIUM, category="APPLICATION_UPDATE"),
    Rule("your application is under review", "applied", MEDIUM, category="APPLICATION_UPDATE"),
    Rule("following up on your application", "applied", MEDIUM, category="APPLICATION_UPDATE"),
    Rule("select a time", "interview", MEDIUM, category="INTERVIEW", requires_any=("interview", "recruiter", "hiring team", "phone screen", "talent acquisition")),
    Rule("choose a time", "interview", MEDIUM, category="INTERVIEW", requires_any=("interview", "recruiter", "hiring team", "phone screen", "talent acquisition")),
    Rule("calendar invite", "interview", MEDIUM, category="INTERVIEW", requires_any=("interview", "recruiter", "hiring team", "phone screen")),
    Rule("google meet", "interview", MEDIUM, category="INTERVIEW", requires_any=("interview", "recruiter", "hiring team", "phone screen", "screening")),
    Rule("microsoft teams", "interview", MEDIUM, category="INTERVIEW", requires_any=("interview", "recruiter", "hiring team", "phone screen", "screening")),
    Rule("zoom call", "interview", MEDIUM, category="INTERVIEW", requires_any=("interview", "recruiter", "hiring team", "phone screen", "screening")),
    Rule("schedule a call", "interview", MEDIUM, category="INTERVIEW", requires_any=("interview", "recruiter", "hiring manager", "hiring team", "talent acquisition", "phone screen")),
    Rule("schedule a meeting", "interview", MEDIUM, category="INTERVIEW", requires_any=("interview", "recruiter", "hiring manager", "hiring team", "talent acquisition", "phone screen")),
    Rule("introductory call", "interview", MEDIUM, category="INTERVIEW", requires_any=("role", "position", "opportunity", "recruiter", "hiring")),
    Rule("recruiter call", "interview", MEDIUM, category="INTERVIEW"),
    Rule("salary", "offer", WEAK, category="OFFER", requires_any=("offer", "offer letter", "employment", "compensation package")),
    Rule("compensation", "offer", MEDIUM, category="OFFER", requires_any=("offer", "offer letter", "employment", "salary")),
    Rule("benefits", "offer", WEAK, category="OFFER", requires_any=("offer", "offer letter", "employment", "onboarding")),
    Rule("start date", "accepted", WEAK, category="ACCEPTED", requires_any=("offer", "welcome", "onboarding", "join", "accepted")),
    Rule("background check", "accepted", MEDIUM, category="ACCEPTED", requires_any=("offer", "employment", "onboarding", "start date", "next steps")),
    Rule("onboarding", "accepted", MEDIUM, category="ACCEPTED", requires_any=("offer", "welcome", "start date", "join", "next steps", "background check")),
    Rule("accepted", "accepted", WEAK, category="ACCEPTED", requires_any=("offer", "your offer", "position", "role")),
    Rule("unfortunately", "rejected", MEDIUM, category="REJECTION", requires_any=("application", "position", "role", "candidate", "selected", "moving forward")),
    Rule("at this time", "rejected", WEAK, category="REJECTION", requires_any=("application", "position", "role", "candidate", "selected", "moving forward")),
    Rule("future opportunities", "rejected", WEAK, category="REJECTION", requires_any=("application", "position", "role", "candidate", "selected", "moving forward")),
    Rule("down the line", "rejected", MEDIUM, category="REJECTION", requires_any=("application", "position", "role", "candidate", "selected", "moving forward")),
)

CATEGORY_ONLY_RULES: tuple[Rule, ...] = (
    Rule("application update", "APPLICATION_UPDATE", MEDIUM, kind="category", requires_any=("application", "status", "update")),
    Rule("application status update", "APPLICATION_UPDATE", STRONG, kind="category"),
    Rule("important information about your application", "APPLICATION_UPDATE", MEDIUM, kind="category"),
    Rule("important information regarding your application", "APPLICATION_UPDATE", MEDIUM, kind="category"),
    Rule("message from the hiring team", "APPLICATION_UPDATE", MEDIUM, kind="category"),
    Rule("recruiter", "RECRUITER_OUTREACH", WEAK, kind="category", requires_any=("role", "position", "opportunity", "connect")),
    Rule("talent acquisition", "RECRUITER_OUTREACH", WEAK, kind="category", requires_any=("role", "position", "opportunity", "connect")),
    Rule("would like to connect", "RECRUITER_OUTREACH", WEAK, kind="category", requires_any=("role", "position", "opportunity", "recruiter")),
    Rule("coffee chat", "NETWORKING", WEAK, kind="category", requires_any=("role", "career", "opportunity", "networking")),
    Rule("following up", "FOLLOW_UP", WEAK, kind="category", requires_any=("application", "interview", "offer", "role", "position")),
    Rule("checking in", "FOLLOW_UP", WEAK, kind="category", requires_any=("application", "interview", "offer", "role", "position")),
)

JOB_ALERT_SUBJECT_SIGNALS = (
    "job alert",
    "recommended jobs",
    "recommended job",
    "new jobs matching",
    "jobs matching",
    "jobs for you",
    "jobs you may like",
    "roles you may like",
    "positions for you",
    "opportunities for you",
    "matched jobs",
    "job match",
    "new job",
    "new role",
    "new position",
    "now hiring",
    "hiring now",
    "open roles",
    "open positions",
    "job openings",
)

JOB_ALERT_BODY_SIGNALS = (
    "do you want to get more jobs like this",
    "get more jobs like this",
    "more jobs like this",
    "keep your profile up to date",
    "this job match email",
    "apply now",
    "apply on website",
    "quick apply",
    "browse jobs",
    "browse open roles",
    "current openings",
    "explore jobs",
    "explore roles",
    "job openings",
    "learn more and apply",
    "open positions",
    "open roles",
    "search jobs",
    "submit your application today",
    "view all jobs",
    "view open roles",
)

CONTENT_MARKETING_SIGNALS = (
    "blog post",
    "case study",
    "customer story",
    "inside ",
    "latest from",
    "learn more about",
    "newsletter",
    "read more",
    "weekly digest",
    "webinar",
    "download the app",
    "follow us",
    "unsubscribe",
    "manage preferences",
)

GENERIC_JOB_TERMS = (
    "job",
    "role",
    "position",
    "opportunity",
    "candidate",
    "recruiter",
    "hiring",
    "careers",
    "linkedin",
    "indeed",
)

AMBIGUOUS_APPLICATION_UPDATE_SIGNALS = (
    "application update",
    "application status",
    "update about your application",
    "update regarding your application",
    "information about your application",
    "information regarding your application",
    "next steps for your application",
    "message from the hiring team",
)

# Aggregate/batch status updates are lifecycle emails, but they should not be
# interpreted as a single application receipt/update. These usually come from
# job boards/ATS-style aggregators and contain repeated status rows such as:
# "Expired, Applied 28 days ago". In that example, "Applied" is historical
# metadata; "Expired" is the current lifecycle outcome.
BATCH_UPDATE_CONTEXT_SIGNALS = (
    "your applications to the following",
    "applications to the following companies",
    "the following applications",
    "multiple applications",
    "application status updates",
    "updates about your applications",
)

BATCH_SUBJECT_PATTERNS = (
    re.compile(r"\ban update from .+\band\s+\d+\s+others\b"),
    re.compile(r"\bupdates? from .+\band\s+\d+\s+others\b"),
    re.compile(r"\bapplication updates?\b"),
)

# Current status tokens. Keep these generic and status-oriented rather than
# company/example-specific. The status row detector below uses repeated status
# language and plural application context to determine batch semantics.
BATCH_EXPIRED_PATTERNS = (
    re.compile(r"\bexpired\b(?:\s+applied\s+\d+\s+days?\s+ago)?"),
    re.compile(r"\bapplications?\s+(?:has|have)\s+expired\b"),
    re.compile(r"\bno\s+longer\s+active\b"),
)

BATCH_REJECTED_PATTERNS = (
    re.compile(r"\bnot\s+selected\b"),
    re.compile(r"\brejected\b"),
    re.compile(r"\bdeclined\b"),
    re.compile(r"\bclosed\b"),
)

BATCH_ACTIVE_METADATA_PATTERNS = (
    re.compile(r"\bapplied\s+\d+\s+days?\s+ago\b"),
    re.compile(r"\bsubmitted\s+\d+\s+days?\s+ago\b"),
)

ATS_SENDERS = (
    "greenhouse",
    "lever",
    "workday",
    "ashby",
    "smartrecruiters",
    "bamboohr",
    "icims",
    "jobvite",
)

RISKY_JOB_BOARD_SENDERS = (
    "linkedin",
    "indeed",
    "ziprecruiter",
    "monster",
    "careerbuilder",
)

RECRUITING_SENDER_HINTS = (
    "recruiting",
    "talent",
    "careers",
    "jobs",
)


def _rule_can_fire(ctx: EmailContext, rule: Rule, field: str) -> bool:
    text = _field_text(ctx, field)
    if not _contains_phrase(text, rule.phrase):
        return False

    companion_space = " ".join(
        getattr(ctx, name)
        for name in ("subject", "body", "email_text")
    )

    if rule.requires_any and not _contains_any(companion_space, rule.requires_any):
        return False

    if rule.excludes_any and _contains_any(companion_space, rule.excludes_any):
        return False

    return True


def _match_rules(ctx: EmailContext, rules: tuple[Rule, ...]) -> list[Match]:
    matches: list[Match] = []

    for rule in rules:
        for field in rule.fields:
            if _rule_can_fire(ctx, rule, field):
                weight = rule.weight * FIELD_MULTIPLIERS.get(field, 1.0)
                matches.append(
                    Match(
                        target=rule.target,
                        rule=rule.phrase,
                        weight=weight,
                        kind=rule.kind,
                        field=field,
                        category=rule.category,
                        hard=rule.hard,
                        requires_any=rule.requires_any,
                        excludes_any=rule.excludes_any,
                    )
                )
                break

    return matches


def _apply_stage_matches(stage_scores: dict, category_scores: dict, matched_rules: list, matches: list[Match]) -> None:
    for match in matches:
        if match.target in STAGES:
            stage_scores[match.target] = stage_scores.get(match.target, 0.0) + match.weight
            if match.category:
                category_scores[match.category] = category_scores.get(match.category, 0.0) + match.weight
        elif match.target in category_scores:
            category_scores[match.target] = category_scores.get(match.target, 0.0) + match.weight
        _append_match(matched_rules, match)


def _detect_hard_lifecycle(ctx: EmailContext, matched_rules: list) -> tuple[dict, dict, list[Match]]:
    stage_scores = _blank_scores()
    category_scores = _blank_category_scores()
    matches = _match_rules(ctx, HARD_LIFECYCLE_RULES)
    _apply_stage_matches(stage_scores, category_scores, matched_rules, matches)
    return stage_scores, category_scores, matches


def _detect_marketing_exclusion(ctx: EmailContext, matched_rules: list, *, has_hard_lifecycle: bool) -> tuple[bool, str | None, str | None]:
    if has_hard_lifecycle:
        return False, None, None

    subject_signal = next((signal for signal in JOB_ALERT_SUBJECT_SIGNALS if signal in ctx.subject), None)
    body_signal = next((signal for signal in JOB_ALERT_BODY_SIGNALS if signal in f"{ctx.body} {ctx.email_text}"), None)
    content_signal = next((signal for signal in CONTENT_MARKETING_SIGNALS if signal in ctx.full_text), None)
    risky_sender = next((signal for signal in RISKY_JOB_BOARD_SENDERS if signal in ctx.sender), None)

    if subject_signal:
        _add_score({}, matched_rules, "not_job_related", SCORE_NORMALIZER, subject_signal, kind="job_alert_subject", field="subject", hard=True)
        return True, "rule_job_alert_marketing", subject_signal

    if risky_sender and (body_signal or _contains_any(ctx.full_text, JOB_ALERT_SUBJECT_SIGNALS)):
        signal = body_signal or risky_sender
        _add_score({}, matched_rules, "not_job_related", SCORE_NORMALIZER, signal, kind="job_board_marketing", field="sender/full_text", hard=True)
        return True, "rule_job_board_marketing", signal

    if body_signal and not _context_contains_any(ctx, AMBIGUOUS_APPLICATION_UPDATE_SIGNALS):
        _add_score({}, matched_rules, "not_job_related", SCORE_NORMALIZER, body_signal, kind="job_alert_body", field="body/email_text", hard=True)
        return True, "rule_job_alert_marketing", body_signal

    if content_signal and not _context_contains_any(ctx, AMBIGUOUS_APPLICATION_UPDATE_SIGNALS):
        _add_score({}, matched_rules, "not_job_related", SCORE_NORMALIZER, content_signal, kind="content_marketing", field="full_text", hard=True)
        return True, "rule_content_marketing", content_signal

    return False, None, None


def _score_contextual_rules(ctx: EmailContext, stage_scores: dict, category_scores: dict, matched_rules: list) -> None:
    matches = _match_rules(ctx, CONTEXTUAL_STAGE_RULES)
    _apply_stage_matches(stage_scores, category_scores, matched_rules, matches)

    category_matches = _match_rules(ctx, CATEGORY_ONLY_RULES)
    _apply_stage_matches(stage_scores, category_scores, matched_rules, category_matches)


def _score_sender(ctx: EmailContext, matched_rules: list) -> tuple[float, float]:
    job_signal_raw = 0.0
    non_job_raw = 0.0

    for signal in ATS_SENDERS:
        if signal in ctx.sender:
            job_signal_raw += MEDIUM
            _append_match(matched_rules, Match("job_signal", signal, MEDIUM, "ats_sender", "sender"))

    for signal in RECRUITING_SENDER_HINTS:
        if signal in ctx.sender:
            job_signal_raw += WEAK
            _append_match(matched_rules, Match("job_signal", signal, WEAK, "recruiting_sender", "sender"))

    for signal in RISKY_JOB_BOARD_SENDERS:
        if signal in ctx.sender:
            non_job_raw += WEAK
            _append_match(matched_rules, Match("not_job_related", signal, WEAK, "risky_job_board_sender", "sender"))

    return job_signal_raw, non_job_raw


def _score_generic_job_signals(ctx: EmailContext, matched_rules: list) -> tuple[float, float]:
    job_signal_raw = 0.0
    non_job_raw = 0.0

    for signal in GENERIC_JOB_TERMS:
        if signal in ctx.full_text:
            job_signal_raw += TINY
            _append_match(matched_rules, Match("job_signal", signal, TINY, "generic_job_signal", "full_text"))

    for signal in (*JOB_ALERT_SUBJECT_SIGNALS, *JOB_ALERT_BODY_SIGNALS, *CONTENT_MARKETING_SIGNALS):
        if signal in ctx.full_text:
            non_job_raw += WEAK
            _append_match(matched_rules, Match("not_job_related", signal, WEAK, "generic_negative_signal", "full_text"))

    return job_signal_raw, non_job_raw


def _normalize_scores(raw_scores: dict) -> dict:
    return {
        key: round(
            min(max(float(raw_scores.get(key, 0.0)), 0.0) / SCORE_NORMALIZER, 0.99),
            4,
        )
        for key in raw_scores
    }


def _rank_mapping(scores: dict) -> tuple:
    sorted_scores = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    top_key, top_score = sorted_scores[0]
    second_key, second_score = sorted_scores[1] if len(sorted_scores) > 1 else (None, 0.0)
    return top_key, top_score, second_key, second_score


def _rank_scores(stage_scores: dict) -> tuple:
    sorted_scores = sorted(
        stage_scores.items(),
        key=lambda item: (item[1], DECISIVE_STAGE_PRIORITY.get(item[0], 0)),
        reverse=True,
    )
    top_stage, top_score = sorted_scores[0]
    second_stage, second_score = sorted_scores[1]
    return top_stage, top_score, second_stage, second_score


def _top_lifecycle_category_score(category_scores: dict) -> tuple[str | None, float]:
    lifecycle_scores = {
        category: score
        for category, score in category_scores.items()
        if category in APPLICATION_LIFECYCLE_CATEGORIES
    }
    if not lifecycle_scores:
        return None, 0.0
    category, score = max(lifecycle_scores.items(), key=lambda item: item[1])
    return category, float(score or 0.0)


def _has_lifecycle_context(ctx: EmailContext) -> bool:
    # This intentionally checks only hard lifecycle language and explicit
    # application-update language. Contextual phrases such as "select a time"
    # are not lifecycle context unless their companion terms fired during scoring.
    return _context_contains_any(
        ctx,
        tuple(rule.phrase for rule in HARD_LIFECYCLE_RULES)
        + AMBIGUOUS_APPLICATION_UPDATE_SIGNALS,
        fields=("subject", "body", "email_text"),
    )



def _hard_match_stages(matches: list[Match]) -> set[str]:
    return {match.target for match in matches if match.hard and match.target in STAGES}


def _has_decisive_downstream_match(matches: list[Match]) -> bool:
    return any(
        match.hard
        and match.target in {"interview", "offer", "accepted", "rejected"}
        for match in matches
    )


def _apply_downstream_lifecycle_precedence(raw_stage_scores: dict, raw_category_scores: dict, hard_matches: list[Match], matched_rules: list) -> None:
    """Prevent baseline application receipt/update language from burying decisive outcomes.

    Many real emails include baseline application language before the actual event:
    - "Thank you for applying... we'd love to schedule an interview"
    - "Thank you for applying... we filled the position"

    In those cases, applied confirms lifecycle relevance but should not win the final stage.
    """
    if not _has_decisive_downstream_match(hard_matches):
        return

    applied_before = raw_stage_scores.get("applied", 0.0)
    applied_cap = 3.0
    if applied_before > applied_cap:
        raw_stage_scores["applied"] = applied_cap
        _append_match(
            matched_rules,
            Match(
                "applied",
                "baseline_applied_capped_by_decisive_lifecycle_event",
                applied_cap - applied_before,
                "stage_precedence",
                "full_text",
                hard=True,
            ),
        )

    for category in BASELINE_APPLIED_CATEGORIES:
        before = raw_category_scores.get(category, 0.0)
        if before > applied_cap:
            raw_category_scores[category] = applied_cap


def _count_regex_matches(patterns: tuple[re.Pattern[str], ...], text: str) -> int:
    return sum(len(pattern.findall(text)) for pattern in patterns)


def _is_batch_update_context(ctx: EmailContext) -> bool:
    if any(pattern.search(ctx.subject) for pattern in BATCH_SUBJECT_PATTERNS):
        return True

    if _context_contains_any(ctx, BATCH_UPDATE_CONTEXT_SIGNALS, fields=("body", "email_text", "full_text")):
        return True

    # Repeated status rows are a strong generic signal even when the subject is vague.
    active_metadata_count = _count_regex_matches(BATCH_ACTIVE_METADATA_PATTERNS, ctx.full_text)
    terminal_count = _count_regex_matches(BATCH_EXPIRED_PATTERNS + BATCH_REJECTED_PATTERNS, ctx.full_text)
    return active_metadata_count >= 2 and terminal_count >= 1


def _apply_batch_status_rules(
    ctx: EmailContext,
    raw_stage_scores: dict,
    raw_category_scores: dict,
    matched_rules: list,
) -> dict | None:
    """Detect aggregate application status updates and score the current outcome.

    Batch emails often include historical metadata like "Applied 28 days ago" on
    every row. That should not push the email into the applied column when the
    current status for those rows is terminal, e.g. "Expired, Applied 28 days ago".
    """
    if not _is_batch_update_context(ctx):
        return None

    expired_count = _count_regex_matches(BATCH_EXPIRED_PATTERNS, ctx.full_text)
    rejected_count = _count_regex_matches(BATCH_REJECTED_PATTERNS, ctx.full_text)
    active_metadata_count = _count_regex_matches(BATCH_ACTIVE_METADATA_PATTERNS, ctx.full_text)
    terminal_count = expired_count + rejected_count

    _append_match(
        matched_rules,
        Match(
            "job_signal",
            "batch_application_status_context",
            MEDIUM,
            "batch_status_context",
            "subject/body/email_text",
            hard=True,
        ),
    )

    if terminal_count <= 0:
        return {
            "matched": True,
            "stage": None,
            "category": "APPLICATION_UPDATE",
            "reason": "rule_batch_application_update_requires_inference",
            "terminal_count": terminal_count,
            "active_metadata_count": active_metadata_count,
        }

    # Expired/terminal status is the actual current outcome. Cap historical
    # applied metadata so rows like "Expired, Applied 28 days ago" do not win.
    terminal_weight = min(SCORE_NORMALIZER + 2.0, STRONG + terminal_count * MEDIUM)
    raw_stage_scores["rejected"] = raw_stage_scores.get("rejected", 0.0) + terminal_weight
    raw_category_scores["REJECTION"] = raw_category_scores.get("REJECTION", 0.0) + terminal_weight

    applied_before = raw_stage_scores.get("applied", 0.0)
    if active_metadata_count > 0 and applied_before > 2.0:
        raw_stage_scores["applied"] = 2.0
        for category in BASELINE_APPLIED_CATEGORIES:
            raw_category_scores[category] = min(raw_category_scores.get(category, 0.0), 2.0)
        _append_match(
            matched_rules,
            Match(
                "applied",
                "historical_applied_metadata_capped_by_batch_terminal_status",
                2.0 - applied_before,
                "batch_status_precedence",
                "full_text",
                hard=True,
            ),
        )

    signal = "expired" if expired_count else "terminal_batch_status"
    _append_match(
        matched_rules,
        Match(
            "rejected",
            signal,
            terminal_weight,
            "batch_terminal_status",
            "body/email_text",
            "REJECTION",
            True,
        ),
    )
    return {
        "matched": True,
        "stage": "rejected",
        "category": "REJECTION",
        "reason": "rule_batch_application_expired" if expired_count else "rule_batch_terminal_status",
        "terminal_count": terminal_count,
        "expired_count": expired_count,
        "rejected_count": rejected_count,
        "active_metadata_count": active_metadata_count,
    }


def _is_conditional_rejection_context(ctx: EmailContext) -> bool:
    conditional_patterns = (
        "if you are not selected",
        "if not selected",
        "if your qualifications match",
        "if your qualifications match our needs",
        "if your qualifications match our needs for the role",
    )
    return _context_contains_any(ctx, conditional_patterns, fields=("body", "email_text", "full_text"))

def _best_category_for_stage(stage: str, category_scores: dict) -> str:
    possible = [
        category
        for category, mapped_stage in INTERNAL_TO_STAGE.items()
        if mapped_stage == stage
    ]
    if not possible:
        return STAGE_TO_DEFAULT_CATEGORY[stage]

    best = max(possible, key=lambda category: category_scores.get(category, 0.0))
    if category_scores.get(best, 0.0) > 0:
        return best
    return STAGE_TO_DEFAULT_CATEGORY[stage]



def _best_decisive_stage_from_hard_matches(hard_matches: list[Match], raw_stage_scores: dict) -> str | None:
    decisive_stages = {
        match.target
        for match in hard_matches
        if match.hard and match.target in {"interview", "offer", "accepted", "rejected"}
    }
    if not decisive_stages:
        return None
    return max(
        decisive_stages,
        key=lambda stage: (raw_stage_scores.get(stage, 0.0), DECISIVE_STAGE_PRIORITY.get(stage, 0)),
    )

def _build_not_job_result(
    *,
    reason: str,
    signal: str | None,
    matched_rules: list,
    stage_scores: dict,
    category_scores: dict,
    job_signal_score: float,
    non_job_score: float = 0.99,
) -> dict:
    return {
        "matched": True,
        "relevant": False,
        "category": "NOT_JOB_RELATED",
        "stage": None,
        "score": non_job_score,
        "second_stage": None,
        "second_score": 0.0,
        "requires_inference": False,
        "reason": reason,
        "job_signal_score": job_signal_score,
        "non_job_score": non_job_score,
        "raw": {
            "source": "rules",
            "matched_rules": matched_rules,
            "signal": signal,
        },
        "stage_scores": stage_scores,
        "category_scores": category_scores,
    }


def classify_email_stage_by_rules(
    *,
    subject: str,
    sender: str,
    body: str,
    email_text: str,
) -> dict:
    ctx = _build_context(subject=subject, sender=sender, body=body, email_text=email_text)
    raw_stage_scores = _blank_scores()
    raw_category_scores = _blank_category_scores()
    matched_rules: list = []

    hard_stage_scores, hard_category_scores, hard_matches = _detect_hard_lifecycle(ctx, matched_rules)
    for stage, score in hard_stage_scores.items():
        raw_stage_scores[stage] += score
    for category, score in hard_category_scores.items():
        raw_category_scores[category] += score

    _apply_downstream_lifecycle_precedence(raw_stage_scores, raw_category_scores, hard_matches, matched_rules)

    _score_contextual_rules(ctx, raw_stage_scores, raw_category_scores, matched_rules)
    batch_summary = _apply_batch_status_rules(ctx, raw_stage_scores, raw_category_scores, matched_rules)
    _apply_downstream_lifecycle_precedence(raw_stage_scores, raw_category_scores, hard_matches, matched_rules)

    stage_scores = _normalize_scores(raw_stage_scores)
    top_stage, top_score, second_stage, second_score = _rank_scores(stage_scores)

    matched = (
        top_score >= RULE_ACCEPT_THRESHOLD
        and (top_score - second_score) >= RULE_MARGIN_THRESHOLD
    )

    raw = {
        "source": "rules",
        "matched_rules": matched_rules,
        "has_hard_lifecycle": bool(hard_matches),
    }

    if matched:
        return {
            "matched": True,
            "stage": top_stage,
            "score": top_score,
            "second_stage": second_stage,
            "second_score": second_score,
            "raw": raw,
            "stage_scores": stage_scores,
        }

    raw["reason"] = "low_confidence_or_low_margin"
    return {
        "matched": False,
        "stage": None,
        "score": 0.0,
        "second_stage": None,
        "second_score": 0.0,
        "raw": raw,
        "stage_scores": stage_scores,
    }


def classify_email_by_rules(
    *,
    subject: str,
    sender: str,
    body: str,
    email_text: str,
) -> dict:
    ctx = _build_context(subject=subject, sender=sender, body=body, email_text=email_text)

    raw_stage_scores = _blank_scores()
    raw_category_scores = _blank_category_scores()
    matched_rules: list = []

    hard_stage_scores, hard_category_scores, hard_matches = _detect_hard_lifecycle(ctx, matched_rules)
    for stage, score in hard_stage_scores.items():
        raw_stage_scores[stage] += score
    for category, score in hard_category_scores.items():
        raw_category_scores[category] += score

    has_hard_lifecycle = bool(hard_matches)
    sender_job_raw, sender_non_job_raw = _score_sender(ctx, matched_rules)
    generic_job_raw, generic_non_job_raw = _score_generic_job_signals(ctx, matched_rules)

    marketing_excluded, marketing_reason, marketing_signal = _detect_marketing_exclusion(
        ctx,
        matched_rules,
        has_hard_lifecycle=has_hard_lifecycle,
    )

    _score_contextual_rules(ctx, raw_stage_scores, raw_category_scores, matched_rules)
    batch_summary = _apply_batch_status_rules(ctx, raw_stage_scores, raw_category_scores, matched_rules)
    _apply_downstream_lifecycle_precedence(raw_stage_scores, raw_category_scores, hard_matches, matched_rules)

    stage_scores = _normalize_scores(raw_stage_scores)
    category_scores = _normalize_scores(raw_category_scores)

    top_stage, top_score, second_stage, second_score = _rank_scores(stage_scores)
    top_category, category_score, second_category, category_second_score = _rank_mapping(category_scores)
    top_lifecycle_category, lifecycle_category_score = _top_lifecycle_category_score(category_scores)

    job_signal_raw = sender_job_raw + generic_job_raw + max(raw_stage_scores.values() or [0.0])
    non_job_raw = sender_non_job_raw + generic_non_job_raw
    job_signal_score = round(min(max(job_signal_raw, 0.0) / SCORE_NORMALIZER, 0.99), 4)
    non_job_score = round(min(max(non_job_raw, 0.0) / SCORE_NORMALIZER, 0.99), 4)

    if marketing_excluded:
        return _build_not_job_result(
            reason=marketing_reason or "rule_marketing_exclusion",
            signal=marketing_signal,
            matched_rules=matched_rules,
            stage_scores=stage_scores,
            category_scores=category_scores,
            job_signal_score=job_signal_score,
            non_job_score=0.99,
        )

    if batch_summary and batch_summary.get("stage"):
        batch_stage = batch_summary["stage"]
        batch_category = batch_summary.get("category") or _best_category_for_stage(batch_stage, category_scores)
        batch_score = max(stage_scores.get(batch_stage, 0.0), 0.9)
        return {
            "matched": True,
            "relevant": True,
            "category": batch_category,
            "stage": batch_stage,
            "score": batch_score,
            "second_stage": second_stage,
            "second_score": second_score,
            "requires_inference": False,
            "reason": batch_summary.get("reason", "rule_batch_application_status"),
            "job_signal_score": max(job_signal_score, batch_score),
            "non_job_score": non_job_score,
            "raw": {
                "source": "rules",
                "matched_rules": matched_rules,
                "has_hard_lifecycle": has_hard_lifecycle,
                "batch_summary": batch_summary,
            },
            "stage_scores": stage_scores,
            "category_scores": category_scores,
        }

    decisive_stage = _best_decisive_stage_from_hard_matches(hard_matches, raw_stage_scores)
    if decisive_stage:
        category = _best_category_for_stage(decisive_stage, category_scores)
        decisive_score = max(stage_scores.get(decisive_stage, 0.0), 0.9)
        return {
            "matched": True,
            "relevant": True,
            "category": category,
            "stage": decisive_stage,
            "score": decisive_score,
            "second_stage": second_stage,
            "second_score": second_score,
            "requires_inference": False,
            "reason": "rule_decisive_lifecycle_override",
            "job_signal_score": max(job_signal_score, decisive_score),
            "non_job_score": non_job_score,
            "raw": {
                "source": "rules",
                "matched_rules": matched_rules,
                "has_hard_lifecycle": has_hard_lifecycle,
            },
            "stage_scores": stage_scores,
            "category_scores": category_scores,
        }

    stage_margin = top_score - float(second_score or 0.0)
    if top_score >= RULE_ACCEPT_THRESHOLD and stage_margin >= RULE_MARGIN_THRESHOLD:
        category = _best_category_for_stage(top_stage, category_scores)
        return {
            "matched": True,
            "relevant": True,
            "category": category,
            "stage": top_stage,
            "score": top_score,
            "second_stage": second_stage,
            "second_score": second_score,
            "requires_inference": False,
            "reason": "rule_hard_lifecycle_match" if has_hard_lifecycle else "rule_stage_match",
            "job_signal_score": max(job_signal_score, top_score),
            "non_job_score": non_job_score,
            "raw": {
                "source": "rules",
                "matched_rules": matched_rules,
                "has_hard_lifecycle": has_hard_lifecycle,
            },
            "stage_scores": stage_scores,
            "category_scores": category_scores,
        }

    mapped_stage = INTERNAL_TO_STAGE.get(top_category)
    category_margin = category_score - float(category_second_score or 0.0)
    if (
        mapped_stage
        and top_category in APPLICATION_LIFECYCLE_CATEGORIES
        and category_score >= RULE_ACCEPT_THRESHOLD
        and category_margin >= RULE_MARGIN_THRESHOLD
    ):
        return {
            "matched": True,
            "relevant": True,
            "category": top_category,
            "stage": mapped_stage,
            "score": category_score,
            "second_stage": INTERNAL_TO_STAGE.get(second_category),
            "second_score": category_second_score,
            "requires_inference": False,
            "reason": "rule_category_match",
            "job_signal_score": max(job_signal_score, category_score),
            "non_job_score": non_job_score,
            "raw": {"source": "rules", "matched_rules": matched_rules},
            "stage_scores": stage_scores,
            "category_scores": category_scores,
        }

    has_lifecycle_context = _has_lifecycle_context(ctx) or lifecycle_category_score > 0.0

    if not has_lifecycle_context:
        if non_job_score >= NOT_JOB_RELATED_THRESHOLD or job_signal_score < JOB_SIGNAL_ACCEPT_THRESHOLD:
            _append_match(
                matched_rules,
                Match(
                    "not_job_related",
                    "no_application_lifecycle_context",
                    SCORE_NORMALIZER,
                    "generic_job_or_low_signal",
                    "full_text",
                    hard=True,
                ),
            )
            return _build_not_job_result(
                reason="rule_generic_job_without_lifecycle",
                signal="no_application_lifecycle_context",
                matched_rules=matched_rules,
                stage_scores=stage_scores,
                category_scores=category_scores,
                job_signal_score=job_signal_score,
                non_job_score=max(non_job_score, 0.99),
            )

    ambiguous_signal = next(
        (signal for signal in AMBIGUOUS_APPLICATION_UPDATE_SIGNALS if signal in ctx.full_text),
        top_lifecycle_category,
    )

    if has_lifecycle_context:
        _append_match(
            matched_rules,
            Match(
                "job_signal",
                ambiguous_signal or "application_lifecycle_context",
                MEDIUM,
                "application_lifecycle_signal",
                "full_text",
            ),
        )
        return {
            "matched": False,
            "relevant": True,
            "category": top_lifecycle_category or "UNKNOWN",
            "stage": INTERNAL_TO_STAGE.get(top_lifecycle_category),
            "score": 0.0,
            "second_stage": None,
            "second_score": 0.0,
            "requires_inference": True,
            "reason": "rule_ambiguous_lifecycle_requires_inference",
            "job_signal_score": max(job_signal_score, lifecycle_category_score),
            "non_job_score": non_job_score,
            "raw": {"source": "rules", "matched_rules": matched_rules},
            "stage_scores": stage_scores,
            "category_scores": category_scores,
        }

    return _build_not_job_result(
        reason="rule_no_application_lifecycle_context",
        signal="no_application_lifecycle_context",
        matched_rules=matched_rules,
        stage_scores=stage_scores,
        category_scores=category_scores,
        job_signal_score=job_signal_score,
        non_job_score=max(non_job_score, 0.99),
    )
