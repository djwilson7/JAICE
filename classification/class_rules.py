RULE_ACCEPT_THRESHOLD = 0.78
RULE_MARGIN_THRESHOLD = 0.18
JOB_SIGNAL_ACCEPT_THRESHOLD = 0.45
NOT_JOB_RELATED_THRESHOLD = 0.55

STAGES = ("applied", "interview", "offer", "accepted", "rejected")
SCORE_NORMALIZER = 10.0

STRONG = 5.0
MEDIUM = 3.0
WEAK = 1.5

INTERNAL_TO_STAGE = {
    "APPLICATION_RECEIVED": "applied",
    "APPLICATION_UPDATE": "applied",
    "ASSESSMENT": "applied",
    "INTERVIEW": "interview",
    "OFFER": "offer",
    "ACCEPTED": "accepted",
    "REJECTION": "rejected",
}

APPLICATION_LIFECYCLE_CATEGORIES = frozenset(INTERNAL_TO_STAGE.keys())


RULE_GROUPS = {
    "applied": [
        ("thank you for applying", STRONG),
        ("thank you for your application", STRONG),
        ("thank you for your application to", STRONG),
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
        ("coding challenge", MEDIUM),
        ("technical assessment", MEDIUM),
        ("take home assessment", MEDIUM),
        ("take-home assessment", MEDIUM),
        ("complete the assessment", MEDIUM),
        ("complete this assessment", MEDIUM),
        ("following up on your application", MEDIUM),
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
        ("filled the position", STRONG),
        ("moving forward with other candidates", STRONG),
        ("move forward with other candidates", STRONG),
        ("moved forward with other candidates", STRONG),
        ("moving ahead with other candidates", STRONG),
        ("move ahead with other candidates", STRONG),
        ("pursue other candidates", STRONG),
        ("application is expired", STRONG),
        ("application has expired", STRONG),
        ("application expired", STRONG),
        ("applications to the following companies have expired", STRONG),
        ("position is closed", STRONG),
        ("position has closed", STRONG),
        ("closing the role", STRONG),
        ("closing this role", STRONG),
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

CATEGORY_GROUPS = {
    "APPLICATION_RECEIVED": [
        ("thank you for applying", STRONG),
        ("thank you for your application", STRONG),
        ("thank you for your application to", STRONG),
        ("we received your application", STRONG),
        ("we recieved your application", STRONG),
        ("application successfully submitted", STRONG),
        ("application submitted", STRONG),
        ("application sent", STRONG),
        ("application received", MEDIUM),
        ("application recieved", MEDIUM),
    ],
    "APPLICATION_UPDATE": [
        ("application status", MEDIUM),
        ("update on your application", MEDIUM),
        ("following up on your application", MEDIUM),
        ("your application is under review", MEDIUM),
    ],
    "ASSESSMENT": [
        ("coding challenge", STRONG),
        ("technical assessment", STRONG),
        ("take home assessment", STRONG),
        ("take-home assessment", STRONG),
        ("complete the assessment", STRONG),
        ("assessment link", MEDIUM),
    ],
    "INTERVIEW": RULE_GROUPS["interview"],
    "OFFER": RULE_GROUPS["offer"],
    "ACCEPTED": RULE_GROUPS["accepted"],
    "REJECTION": RULE_GROUPS["rejected"],
    "RECRUITER_OUTREACH": [
        ("recruiter", MEDIUM),
        ("talent acquisition", MEDIUM),
        ("sourcing", WEAK),
        ("opportunity that may be a fit", MEDIUM),
        ("role that may interest you", MEDIUM),
        ("would like to connect", WEAK),
    ],
    "NETWORKING": [
        ("coffee chat", MEDIUM),
        ("networking", MEDIUM),
        ("connect about opportunities", MEDIUM),
    ],
    "FOLLOW_UP": [
        ("following up", MEDIUM),
        ("checking in", WEAK),
        ("next steps", WEAK),
    ],
}

JOB_SIGNALS = (
    "application",
    "applied",
    "applying",
    "interview",
    "phone screen",
    "recruiter",
    "talent acquisition",
    "hiring team",
    "hiring manager",
    "job offer",
    "offer letter",
    "assessment",
    "coding challenge",
    "position",
    "role",
    "candidate",
)

ATS_OR_RECRUITING_SENDERS = (
    "greenhouse",
    "lever",
    "workday",
    "ashby",
    "smartrecruiters",
    "bamboohr",
    "icims",
    "jobvite",
    "linkedin",
    "indeed",
    "recruiting",
    "talent",
    "careers",
)

MARKETING_OR_ALERT_SIGNALS = (
    "unsubscribe",
    "job alert",
    "recommended jobs",
    "recommended job",
    "new jobs matching",
    "jobs you may like",
    "newsletter",
    "digest",
    "sale",
    "promotion",
    "webinar",
)

MARKETING_BODY_EXCLUSION_SIGNALS = (
    "do you want to get more jobs like this",
    "get more jobs like this",
    "more jobs like this",
    "keep your profile up to date",
    "keep your indeed profile up to date",
    "this job match email",
    "job match email",
    "apply now",
    "apply on website",
    "apply with your profile",
    "quick apply",
    "now hiring",
    "hiring now",
    "we are hiring",
    "we're hiring",
    "apply today",
    "start applying",
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

MARKETING_ALERT_SUBJECT_SIGNALS = (
    "dream job",
    "new job",
    "new match",
    "new position",
    "new role",
    "new opportunity",
    "new possibilities",
    "new possibility",
    "new possiblities",
    "new possibilites",
    "job match",
    "jobs matching",
    "matched jobs",
    "jobs for you",
    "positions for you",
    "roles for you",
    "opportunities for you",
    "recommended position",
    "recommended role",
    "recommended opportunity",
    "jobs you may like",
    "roles you may like",
    "positions you may like",
    "opportunities you may like",
    "now hiring",
    "hiring now",
    "we are hiring",
    "we're hiring",
    "open roles",
    "open positions",
    "job openings",
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
)

APPLICATION_LIFECYCLE_SIGNALS = (
    "accepted your offer",
    "application confirmation",
    "application has been received",
    "application has been recieved",
    "application has been sent",
    "application has been submitted",
    "application is under review",
    "application received",
    "application recieved",
    "application rejected",
    "application status",
    "application submitted",
    "application unsuccessful",
    "application was received",
    "application was recieved",
    "application was sent",
    "application was submitted",
    "assessment link",
    "background check",
    "calendar invite",
    "coding challenge",
    "complete the assessment",
    "complete your assessment",
    "employment offer",
    "formal offer",
    "interview confirmed",
    "interview invitation",
    "interview scheduled",
    "job offer",
    "move forward with other candidates",
    "moving forward with other candidates",
    "next steps for onboarding",
    "not moving forward",
    "not selected",
    "offer accepted",
    "offer letter",
    "phone screen",
    "position has been filled",
    "schedule an interview",
    "select a time",
    "start date confirmed",
    "technical assessment",
    "thank you for your application",
    "thank you for your application to",
    "thank you for applying",
    "update on your application",
    "we received your application",
    "we recieved your application",
    "we will review your application",
    "we'll review your application",
    "welcome aboard",
    "welcome to the team",
    "your application",
    "your offer",
)

APPLICATION_UPDATE_SUBJECT_SIGNALS = (
    "important information about your application",
    "important information regarding your application",
    "information about your application",
    "information regarding your application",
    "update about your application",
    "update regarding your application",
    "application update",
    "application status update",
)

INDEED_MARKETING_FEEDBACK_SIGNALS = (
    "this is a bad match",
    "this isn't a good match",
    "this is not a good match",
    "not a good match for me",
)

def _blank_scores() -> dict:
    return {stage: 0.0 for stage in STAGES}


def _blank_category_scores() -> dict:
    return {category: 0.0 for category in (*CATEGORY_GROUPS.keys(), "NOT_JOB_RELATED", "UNKNOWN")}


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


def _apply_category_rules(text: str, scores: dict, matched_rules: list) -> None:
    for category, rules in CATEGORY_GROUPS.items():
        for phrase, weight in rules:
            if phrase in text:
                _add_score(scores, matched_rules, category, weight, phrase)


def _contains_any(text: str, terms: tuple) -> bool:
    return any(term in text for term in terms)


def _find_marketing_alert_subject_signal(subject: str) -> str | None:
    subject_text = str(subject or "").lower()
    return next(
        (
            signal
            for signal in MARKETING_ALERT_SUBJECT_SIGNALS
            if signal in subject_text
        ),
        None,
    )


def _find_marketing_body_exclusion_signal(body: str, email_text: str) -> str | None:
    body_text = " ".join(str(part or "").lower() for part in (body, email_text))
    return next(
        (
            signal
            for signal in MARKETING_BODY_EXCLUSION_SIGNALS
            if signal in body_text
        ),
        None,
    )


def _find_content_marketing_signal(subject: str, body: str, email_text: str) -> str | None:
    text = " ".join(str(part or "").lower() for part in (subject, body, email_text))
    return next(
        (
            signal
            for signal in CONTENT_MARKETING_SIGNALS
            if signal in text
        ),
        None,
    )


def _find_application_update_subject_signal(subject: str) -> str | None:
    subject_text = str(subject or "").lower()
    return next(
        (
            signal
            for signal in APPLICATION_UPDATE_SUBJECT_SIGNALS
            if signal in subject_text
        ),
        None,
    )


def _has_application_lifecycle_context(text: str) -> bool:
    return _contains_any(text, APPLICATION_LIFECYCLE_SIGNALS)


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


def _find_indeed_marketing_signal(sender: str, text: str) -> str | None:
    if "indeed" not in str(sender or "").lower():
        return None

    return next(
        (
            signal
            for signal in INDEED_MARKETING_FEEDBACK_SIGNALS
            if signal in text
        ),
        None,
    )


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
            "filled the position",
            "position is closed",
            "position has closed",
            "closing the role",
            "closing this role",
            "no longer open to new applications",
            "no longer accepting applications",
            "closed to new applications",
            "filled internally",
            "application is expired",
            "application has expired",
            "application expired",
            "applications to the following companies have expired",
            "moving forward with other candidates",
            "move forward with other candidates",
            "moved forward with other candidates",
            "moving ahead with other candidates",
            "move ahead with other candidates",
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


def _normalize_category_scores(raw_scores: dict) -> dict:
    return {
        category: round(
            min(max(float(raw_scores.get(category, 0.0)), 0.0) / SCORE_NORMALIZER, 0.99),
            4,
        )
        for category in raw_scores
    }


def _rank_scores(stage_scores: dict) -> tuple:
    sorted_scores = sorted(stage_scores.items(), key=lambda item: item[1], reverse=True)
    top_stage, top_score = sorted_scores[0]
    second_stage, second_score = sorted_scores[1]
    return top_stage, top_score, second_stage, second_score


def _rank_mapping(scores: dict) -> tuple:
    sorted_scores = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    top_key, top_score = sorted_scores[0]
    second_key, second_score = sorted_scores[1] if len(sorted_scores) > 1 else (None, 0.0)
    return top_key, top_score, second_key, second_score


def _score_job_signal(text: str, sender: str, matched_rules: list) -> tuple[float, float]:
    job_signal_raw = 0.0
    non_job_raw = 0.0

    for signal in JOB_SIGNALS:
        if signal in text:
            job_signal_raw += WEAK
            matched_rules.append({"stage": "job_signal", "rule": signal, "weight": WEAK, "kind": "job_signal"})

    sender_text = str(sender or "").lower()
    for signal in ATS_OR_RECRUITING_SENDERS:
        if signal in sender_text or signal in text:
            job_signal_raw += MEDIUM
            matched_rules.append({"stage": "job_signal", "rule": signal, "weight": MEDIUM, "kind": "sender"})

    for signal in MARKETING_OR_ALERT_SIGNALS:
        if signal in text:
            non_job_raw += MEDIUM
            matched_rules.append({"stage": "not_job_related", "rule": signal, "weight": MEDIUM, "kind": "negative"})

    return (
        round(min(max(job_signal_raw, 0.0) / SCORE_NORMALIZER, 0.99), 4),
        round(min(max(non_job_raw, 0.0) / SCORE_NORMALIZER, 0.99), 4),
    )


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


def classify_email_by_rules(
    *,
    subject: str,
    sender: str,
    body: str,
    email_text: str,
) -> dict:
    text = " ".join(str(part or "").lower() for part in (subject, sender, body, email_text))
    stage_result = classify_email_stage_by_rules(
        subject=subject,
        sender=sender,
        body=body,
        email_text=email_text,
    )

    raw_category_scores = _blank_category_scores()
    matched_rules = list(stage_result.get("raw", {}).get("matched_rules", []))
    _apply_category_rules(text, raw_category_scores, matched_rules)
    category_scores = _normalize_category_scores(raw_category_scores)
    top_category, category_score, second_category, second_score = _rank_mapping(category_scores)
    top_lifecycle_category, lifecycle_category_score = _top_lifecycle_category_score(category_scores)
    job_signal_score, non_job_score = _score_job_signal(text, sender, matched_rules)
    marketing_alert_signal = _find_marketing_alert_subject_signal(subject)
    marketing_body_signal = _find_marketing_body_exclusion_signal(body, email_text)
    content_marketing_signal = _find_content_marketing_signal(subject, body, email_text)
    application_update_signal = _find_application_update_subject_signal(subject)
    indeed_marketing_signal = _find_indeed_marketing_signal(sender, text)
    has_lifecycle_context = _has_application_lifecycle_context(text)

    if (
        marketing_alert_signal
        or marketing_body_signal
        or indeed_marketing_signal
        or (content_marketing_signal and not has_lifecycle_context)
    ):
        if marketing_alert_signal:
            matched_signal = marketing_alert_signal
            matched_kind = "marketing_alert_subject"
        elif marketing_body_signal:
            matched_signal = marketing_body_signal
            matched_kind = "marketing_body_exclusion"
        elif indeed_marketing_signal:
            matched_signal = indeed_marketing_signal
            matched_kind = "indeed_marketing_feedback"
        elif content_marketing_signal:
            matched_signal = content_marketing_signal
            matched_kind = "content_marketing"
        matched_rules.append(
            {
                "stage": "not_job_related",
                "rule": matched_signal,
                "weight": SCORE_NORMALIZER,
                "kind": matched_kind,
            }
        )
        return {
            "matched": True,
            "relevant": False,
            "category": "NOT_JOB_RELATED",
            "stage": None,
            "score": 0.99,
            "second_stage": None,
            "second_score": 0.0,
            "requires_inference": False,
            "reason": f"rule_{matched_kind}",
            "job_signal_score": job_signal_score,
            "non_job_score": 0.99,
            "raw": {"source": "rules", "matched_rules": matched_rules},
            "stage_scores": stage_result.get("stage_scores", {}),
            "category_scores": category_scores,
        }

    if stage_result.get("matched"):
        stage = stage_result["stage"]
        category = {
            "applied": top_category if INTERNAL_TO_STAGE.get(top_category) == "applied" else "APPLICATION_RECEIVED",
            "interview": "INTERVIEW",
            "offer": "OFFER",
            "accepted": "ACCEPTED",
            "rejected": "REJECTION",
        }[stage]
        return {
            **stage_result,
            "matched": True,
            "relevant": True,
            "category": category,
            "requires_inference": False,
            "reason": "rule_stage_match",
            "job_signal_score": max(job_signal_score, stage_result["score"]),
            "non_job_score": non_job_score,
            "category_scores": category_scores,
            "raw": {
                **stage_result["raw"],
                "matched_rules": matched_rules,
            },
        }

    mapped_stage = INTERNAL_TO_STAGE.get(top_category)
    margin = category_score - float(second_score or 0.0)
    if (
        mapped_stage
        and top_category in APPLICATION_LIFECYCLE_CATEGORIES
        and category_score >= RULE_ACCEPT_THRESHOLD
        and margin >= RULE_MARGIN_THRESHOLD
    ):
        return {
            "matched": True,
            "relevant": True,
            "category": top_category,
            "stage": mapped_stage,
            "score": category_score,
            "second_stage": INTERNAL_TO_STAGE.get(second_category),
            "second_score": second_score,
            "requires_inference": False,
            "reason": "rule_category_match",
            "job_signal_score": max(job_signal_score, category_score),
            "non_job_score": non_job_score,
            "raw": {"source": "rules", "matched_rules": matched_rules},
            "stage_scores": stage_result.get("stage_scores", {}),
            "category_scores": category_scores,
        }

    if (
        non_job_score >= NOT_JOB_RELATED_THRESHOLD
        and job_signal_score < JOB_SIGNAL_ACCEPT_THRESHOLD
        and lifecycle_category_score < RULE_ACCEPT_THRESHOLD
    ):
        return {
            "matched": True,
            "relevant": False,
            "category": "NOT_JOB_RELATED",
            "stage": None,
            "score": non_job_score,
            "second_stage": None,
            "second_score": 0.0,
            "requires_inference": False,
            "reason": "rule_not_job_related",
            "job_signal_score": job_signal_score,
            "non_job_score": non_job_score,
            "raw": {"source": "rules", "matched_rules": matched_rules},
            "stage_scores": stage_result.get("stage_scores", {}),
            "category_scores": category_scores,
        }

    if application_update_signal or has_lifecycle_context or lifecycle_category_score > 0.0:
        matched_rules.append(
            {
                "stage": "job_signal",
                "rule": application_update_signal or top_lifecycle_category or "application_lifecycle_context",
                "weight": MEDIUM,
                "kind": "application_lifecycle_signal",
            }
        )
        reason = (
            "application_update_requires_inference"
            if application_update_signal
            else "application_lifecycle_requires_inference"
        )
    else:
        matched_rules.append(
            {
                "stage": "not_job_related",
                "rule": "no_application_lifecycle_context",
                "weight": SCORE_NORMALIZER,
                "kind": "generic_job_or_low_signal",
            }
        )
        return {
            "matched": True,
            "relevant": False,
            "category": "NOT_JOB_RELATED",
            "stage": None,
            "score": max(non_job_score, 0.99),
            "second_stage": None,
            "second_score": 0.0,
            "requires_inference": False,
            "reason": "rule_no_application_lifecycle_context",
            "job_signal_score": job_signal_score,
            "non_job_score": max(non_job_score, 0.99),
            "raw": {"source": "rules", "matched_rules": matched_rules},
            "stage_scores": stage_result.get("stage_scores", {}),
            "category_scores": category_scores,
        }

    return {
        "matched": False,
        "relevant": (
            has_lifecycle_context
            or lifecycle_category_score > 0.0
            or application_update_signal is not None
        ),
        "category": "UNKNOWN",
        "stage": None,
        "score": 0.0,
        "second_stage": None,
        "second_score": 0.0,
        "requires_inference": True,
        "reason": reason,
        "job_signal_score": job_signal_score,
        "non_job_score": non_job_score,
        "raw": {"source": "rules", "matched_rules": matched_rules},
        "stage_scores": stage_result.get("stage_scores", {}),
        "category_scores": category_scores,
    }
