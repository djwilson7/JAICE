RULE_ACCEPT_THRESHOLD = 0.78
RULE_MARGIN_THRESHOLD = 0.18

STAGES = ("applied", "interview", "offer", "accepted", "rejected")
SCORE_NORMALIZER = 10.0

STRONG = 5.0
MEDIUM = 3.0
WEAK = 1.5


RULE_GROUPS = {
    "applied": [
        ("thank you for applying", STRONG),
        ("we received your application", STRONG),
        ("we recieved your application", STRONG),
        ("your application has been received", STRONG),
        ("your application has been recieved", STRONG),
        ("application successfully submitted", STRONG),
        ("application was successfully submitted", STRONG),
        ("application has been successfully submitted", STRONG),
        ("successfully submitted your application", STRONG),
        ("application submitted", STRONG),
        ("application was submitted", STRONG),
        ("application has been submitted", STRONG),
        ("submitted your application", STRONG),
        ("your application was sent", STRONG),
        ("application sent", STRONG),
        ("successfully sent your application", STRONG),
        ("application was sent", STRONG),
        ("application has been sent", STRONG),
        ("application confirmation", STRONG),
        ("we'll review your application", MEDIUM),
        ("we will review your application", MEDIUM),
        ("application received", MEDIUM),
        ("application recieved", MEDIUM),
        ("application completed", MEDIUM),
        ("application complete", MEDIUM),
        ("applying for", MEDIUM),
        ("applying to", MEDIUM),
        ("thank you for your interest in applying", MEDIUM),
        ("applied for", WEAK),
    ],
    "interview": [
        ("schedule an interview", STRONG),
        ("interview invitation", STRONG),
        ("availability for an interview", STRONG),
        ("phone screen", STRONG),
        ("video interview", STRONG),
        ("telephone conversation", STRONG),
        ("schedule a call", STRONG),
        ("schedule a meeting", STRONG),
        ("zoom interview", STRONG),
        ("zoom call", STRONG),
        ("google meet", STRONG),
        ("microsoft teams", STRONG),
        ("select a time", MEDIUM),
        ("choose a time", MEDIUM),
        ("calendar invite", MEDIUM),
        ("meet with", MEDIUM),
        ("meeting with", MEDIUM),
        ("introductory call", MEDIUM),
        ("recruiter call", MEDIUM),
        ("availability for a call", MEDIUM),
        ("availability for a meeting", MEDIUM),
        ("phone call", MEDIUM),
        ("interview scheduled", MEDIUM),
        ("interview confirmed", MEDIUM),
    ],
    "offer": [
        ("offer letter", STRONG),
        ("pleased to offer", STRONG),
        ("we are excited to offer", STRONG),
        ("we would love to have you onboard", STRONG),
        ("we'd love to have you onboard", STRONG),
        ("love to have you onboard", STRONG),
        ("employment offer", STRONG),
        ("accept this offer", STRONG),
        ("extend an offer", STRONG),
        ("extending an offer", STRONG),
        ("formal offer", STRONG),
        ("job offer", MEDIUM),
        ("compensation", MEDIUM),
        ("salary", WEAK),
        ("benefits", WEAK),
        ("start date", WEAK),
    ],
    "accepted": [
        ("offer accepted", STRONG),
        ("welcome aboard", STRONG),
        ("welcome to the team", STRONG),
        ("welcome to our team", STRONG),
        ("great to have you", STRONG),
        ("we're excited to have you join", STRONG),
        ("we are excited to have you join", STRONG),
        ("excited to have you join", STRONG),
        ("next steps for onboarding", STRONG),
        ("onboarding", MEDIUM),
        ("background check", MEDIUM),
        ("accepted", WEAK),
        ("start date confirmed", WEAK),
    ],
    "rejected": [
        ("not moving forward", STRONG),
        ("will not be moving forward", STRONG),
        ("decided to pursue other candidates", STRONG),
        ("not selected", STRONG),
        ("we regret to inform", STRONG),
        ("position has been filled", STRONG),
        ("position is filled", STRONG),
        ("moving forward with other candidates", STRONG),
        ("pursue other candidates", STRONG),
        ("application is expired", STRONG),
        ("application has expired", STRONG),
        ("application expired", STRONG),
        ("position is closed", STRONG),
        ("position has closed", STRONG),
        ("no longer open to new applications", STRONG),
        ("no longer accepting applications", STRONG),
        ("closed to new applications", STRONG),
        ("filled internally", STRONG),
        ("unfortunately", MEDIUM),
        ("down the line", MEDIUM),
        ("future opportunities", MEDIUM),
        ("at this time", MEDIUM),
        ("application rejected", MEDIUM),
        ("application unsuccessful", MEDIUM),
    ],
}


def _blank_scores() -> dict:
    return {stage: 0.0 for stage in STAGES}


def _add_score(
    scores: dict,
    matched_rules: list,
    stage: str,
    weight: float,
    rule: str,
    kind: str = "phrase",
) -> None:
    scores[stage] = scores.get(stage, 0.0) + weight
    matched_rules.append(
        {
            "stage": stage,
            "rule": rule,
            "weight": weight,
            "kind": kind,
        }
    )


def _apply_phrase_rules(text: str, scores: dict, matched_rules: list) -> None:
    for stage, rules in RULE_GROUPS.items():
        for phrase, weight in rules:
            if phrase in text:
                _add_score(scores, matched_rules, stage, weight, phrase)


def _contains_any(text: str, terms: tuple) -> bool:
    return any(term in text for term in terms)


def _apply_corrections(text: str, scores: dict, matched_rules: list) -> None:
    if "if selected for an interview" in text:
        _add_score(
            scores, matched_rules, "applied", 6.0,
            "if selected for an interview", "correction"
        )
        _add_score(
            scores, matched_rules, "interview", -6.0,
            "if selected for an interview", "correction"
        )

    if "not moving forward to interview" in text or "not moving forward" in text:
        _add_score(
            scores, matched_rules, "rejected", 6.0,
            "not moving forward", "correction"
        )
        _add_score(
            scores, matched_rules, "interview", -6.0,
            "not moving forward", "correction"
        )

    if "we received your application" in text:
        _add_score(
            scores, matched_rules, "applied", 4.0,
            "we received your application", "correction"
        )
        _add_score(
            scores, matched_rules, "accepted", -3.0,
            "we received your application", "correction"
        )

    if "we recieved your application" in text:
        _add_score(
            scores, matched_rules, "applied", 4.0,
            "we recieved your application", "correction"
        )
        _add_score(
            scores, matched_rules, "accepted", -3.0,
            "we recieved your application", "correction"
        )

    if "application" in text and "submitted" in text:
        _add_score(
            scores, matched_rules, "applied", 3.0,
            "application submitted context", "correction"
        )
        _add_score(
            scores, matched_rules, "interview", -3.0,
            "application submitted context", "correction"
        )

    if "application" in text and _contains_any(
        text,
        (
            "received",
            "recieved",
            "submitted",
            "sent",
            "applying",
            "applied",
            "complete",
            "completed",
        ),
    ):
        _add_score(
            scores, matched_rules, "applied", 4.0,
            "application status context", "correction"
        )
        _add_score(
            scores, matched_rules, "interview", -4.0,
            "application status context", "correction"
        )

    if _contains_any(
        text,
        (
            "position has been filled",
            "position is filled",
            "position is closed",
            "position has closed",
            "no longer open to new applications",
            "no longer accepting applications",
            "closed to new applications",
            "filled internally",
            "application is expired",
            "application has expired",
            "application expired",
            "moving forward with other candidates",
            "pursue other candidates",
        ),
    ):
        _add_score(
            scores, matched_rules, "rejected", 6.0,
            "closed filled or expired context", "correction"
        )
        _add_score(
            scores, matched_rules, "applied", -4.0,
            "closed filled or expired context", "correction"
        )
        _add_score(
            scores, matched_rules, "interview", -4.0,
            "closed filled or expired context", "correction"
        )

    if "down the line" in text and _contains_any(text, ("position", "role", "opportunity")):
        _add_score(
            scores, matched_rules, "rejected", 5.0,
            "down the line rejection context", "correction"
        )

    if "job alert" in text or "recommended jobs" in text or "recommended job" in text:
        _add_score(
            scores, matched_rules, "offer", -6.0,
            "job alert or recommended job", "correction"
        )

    if "interview process" in text:
        _add_score(
            scores, matched_rules, "interview", -4.0,
            "interview process", "correction"
        )


def _normalize_scores(raw_scores: dict) -> dict:
    return {
        stage: round(
            min(max(float(raw_scores.get(stage, 0.0)), 0.0) / SCORE_NORMALIZER, 0.99),
            4,
        )
        for stage in STAGES
    }


def _rank_scores(stage_scores: dict) -> tuple:
    sorted_scores = sorted(stage_scores.items(), key=lambda item: item[1], reverse=True)
    top_stage, top_score = sorted_scores[0]
    second_stage, second_score = sorted_scores[1]
    return top_stage, top_score, second_stage, second_score


def classify_email_stage_by_rules(
    *,
    subject: str,
    sender: str,
    body: str,
    email_text: str,
) -> dict:
    text = " ".join(
        str(part or "").lower()
        for part in (subject, sender, body, email_text)
    )
    raw_scores = _blank_scores()
    matched_rules = []

    _apply_phrase_rules(text, raw_scores, matched_rules)
    _apply_corrections(text, raw_scores, matched_rules)

    stage_scores = _normalize_scores(raw_scores)
    top_stage, top_score, second_stage, second_score = _rank_scores(stage_scores)
    matched = (
        top_score >= RULE_ACCEPT_THRESHOLD
        and (top_score - second_score) >= RULE_MARGIN_THRESHOLD
    )

    raw = {
        "source": "rules",
        "matched_rules": matched_rules,
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
