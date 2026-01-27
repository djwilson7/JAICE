import math
import re
from typing import Dict, Set, Tuple, List
import pandas as pd
from bs4 import BeautifulSoup
from common.logger import get_logger
logging = get_logger()

##################################################################################################################
# Remove HTML and Excessive Text Formatting
def normalize_text_block(text: str) -> str:
    if not isinstance(text, str):
        return ""
    text = text.lower()
    text = re.sub(r'[\r\n\t]+', ' ', text)
    text = re.sub(r'[^a-z0-9\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def strip_html(html_content):
    if html_content is None:
        return ""
    soup = BeautifulSoup(html_content, "html.parser")
    for script_or_style in soup(["script", "style"]):
        script_or_style.decompose()
        
    text = soup.get_text()
    lines = (line.strip() for line in text.splitlines())
    chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
    text = '\n'.join(chunk for chunk in chunks if chunk)
    return text

def normalize_text(text: str) -> str:
    text = strip_html(text)
    text = normalize_text_block(text)
    return text

##################################################################################################################
# Placeholders for Layer 1 PII redaction
PH = {
    "EMAIL": "[EMAIL]",
    "PHONE": "[PHONE]",
    "SSN": "[SSN]",
    "CREDIT_CARD": "[CREDIT_CARD]",
    "IPV4": "[IPV4]",
    "IPV6": "[IPV6]",
    "MAC": "[MAC]",
    "URL": "[URL]",
    "DATE": "[DATE]",
    "ADDRESS": "[ADDRESS]",
    "ZIP": "[ZIP]",
    "HANDLE": "[HANDLE]",
    "UUID": "[UUID]",
}

MONTH_NAME_REGEX = r"""
    (?ix)                                   # i = ignore case, x = verbose
    \b
    (                                       # Month first formats
        (January|February|March|April|May|June|July|August|September|October|November|December|
         Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)
        \s+
        \d{1,2}(st|nd|rd|th)?               # day
        (,\s*\d{2,4})?                      # optional comma+year
    )
    |
    (                                       # Day first formats
        \d{1,2}(st|nd|rd|th)?
        \s+
        (January|February|March|April|May|June|July|August|September|October|November|December|
         Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)
        (,\s*\d{2,4})?
    )
    \b
"""

# --- Compiled regex patterns ---
PATTERNS: Dict[str, re.Pattern] = {
    # Emails
    "EMAIL": re.compile(
        r"""
        \b
        [A-Za-z0-9._%+\-]+
        @
        [A-Za-z0-9.\-]+
        \.[A-Za-z]{2,}
        \b
    """,
        re.IGNORECASE | re.VERBOSE,
    ),
    # URLs
    "URL": re.compile(
        r"""
        \b(
            https?://[^\s<>"']+ |
            www\.[^\s<>"']+
        )
    """,
        re.IGNORECASE | re.VERBOSE,
    ),
    # IPv4
    "IPV4": re.compile(
        r"""
        \b
        (?:25[0-5]|2[0-4]\d|1?\d?\d)
        (?:\.
            (?:25[0-5]|2[0-4]\d|1?\d?\d)
        ){3}
        \b
    """,
        re.VERBOSE,
    ),
    # IPv6
    "IPV6": re.compile(
        r"""
        \b
        (?:[A-Fa-f0-9]{1,4}:){2,7}[A-Fa-f0-9]{1,4}
        \b
    """,
        re.VERBOSE,
    ),
    # MAC address
    "MAC": re.compile(
        r"""
        \b
        (?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}
        \b
    """,
        re.VERBOSE,
    ),
    # Social Security Number
    "SSN": re.compile(
        r"""
        \b
        (?!000|666|9\d\d)\d{3}[- ]?(?!00)\d{2}[- ]?(?!0000)\d{4}
        \b
    """,
        re.VERBOSE,
    ),
    # Credit cards
    "CREDIT_CARD": re.compile(
        r"""
    (                               # --- Group 1: Standard card forms ---
        (?<!\d)
        (?:\d[ -]?){13,19}
        (?!\d)
    )
    |
    (                               # --- Group 2: Masked card forms ---
        (?<!\w)                     
        (?:
            [xX*#][ -]?             # mask characters
        ){10,15}                    # 10-15 masked chars
        \d{3,4}                     # last 3–4 real digits
        (?!\w)                      
    )
    """,
        re.VERBOSE,
    ),
    # Dates
    "DATE": re.compile(
        MONTH_NAME_REGEX
        + r"""|
            (
                (?:0?[1-9]|1[0-2])[/\-](?:0?[1-9]|[12]\d|3[01])[/\-](?:19|20)\d{2}  # MM/DD/YYYY
                |
                (?:19|20)\d{2}[-/](?:0[1-9]|1[0-2])[-/](?:0[1-9]|[12]\d|3[01])      # YYYY-MM-DD
            )
        """,
        re.VERBOSE | re.IGNORECASE,
    ),
    # ZIP
    "ZIP": re.compile(r"\b\d{5}(?:-\d{4})?\b"),
    # Address
    "ADDRESS": re.compile(
        r"""
        \b
        \d{1,5}                             # street number
        \s+
        (?:[A-Za-z0-9.\#']+\s+){1,4}        # street name tokens
        (?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Parkway|Pkwy|Circle|Cir)\.?
        \b
    """,
        re.IGNORECASE | re.VERBOSE,
    ),
    # Social handles
    "HANDLE": re.compile(r"(?<!\w)@[A-Za-z0-9_]{2,15}\b"),
    # UUID/GUID
    "UUID": re.compile(
        r"\b[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}\b"
    ),
    "PHONE": re.compile(
        r"""
        \b
        (?:
            (?:\+?1[-.\s]?)?                          # optional country code
            (?:\([2-9]\d{2}\)|[2-9]\d{2})             # area code
            [-.\s]?
            \d{3}                                      # exchange
            [-.\s]?
            \d{4}                                      # subscriber number
        )
        \b
        """,
        re.VERBOSE,
    ),
}

ORDER = [
    "EMAIL",
    "URL",
    "PHONE",
    "IPV4",
    "IPV6",
    "MAC",
    "SSN",
    "CREDIT_CARD",
    "UUID",
    "DATE",
    "ZIP",
    "ADDRESS",
    "HANDLE",
]

def _redact_pii_regex(text: str) -> Tuple[str, Dict[str, int]]:
    counts: Dict[str, int] = {k: 0 for k in PATTERNS.keys()}
    redacted = text

    for key in ORDER:
        pat = PATTERNS[key]
        placeholder = PH.get(key, f"[{key}]")

        def _sub(m):
            counts[key] += 1
            return placeholder

        redacted = pat.sub(_sub, redacted)

    return redacted, counts


def layer_one_pii_redaction(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, int]]:
    global_counts: Dict[str, int] = {k: 0 for k in PATTERNS.keys()}

    redacted_bodies = []

    for row in df.itertuples():
        # ---- BODY ----
        body_text = getattr(row, "body", "") or ""
        red_body, body_counts = _redact_pii_regex(body_text)
        redacted_bodies.append(red_body)

        # accumulate body counts
        for k, v in body_counts.items():
            global_counts[k] += v

    # build new output df
    new_df = df.copy()
    new_df["body"] = redacted_bodies
    return new_df, global_counts


###############################################################################################################
# Layer 2 NER Redaction
NER_TARGETS: Dict[str, str] = {
    "PERSON": "[PERSON]",
    "ORG": "[ORG]",
    "GPE": "[LOCATION]",
    "LOC": "[LOCATION]",
    "FAC": "[LOCATION]",
}

LAYER1_PLACEHOLDERS: Set[str] = {
    "[EMAIL]",
    "[URL]",
    "[IPV4]",
    "[IPV6]",
    "[SSN]",
    "[CREDIT_CARD]",
    "[DATE]",
    "[ZIP]",
    "[ADDRESS]",
    "[HANDLE]",
    "[UUID]",
}


def layer_two_ner_redaction(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, int]]:
    from relevance.relevance_worker import NLP_MODEL

    if NLP_MODEL is None:
        raise RuntimeError("NLP_MODEL is not loaded. Ensure the model is loaded before calling this function.")
    
    nlp_lg = NLP_MODEL

    ner_global_counts = {k: 0 for k in NER_TARGETS.keys()}
    bodies: List[str] = df["body"].tolist()

    new_bodies: List[str] = []

    for doc in nlp_lg.pipe(bodies, batch_size=150):
        redacted_text = doc.text
        doc_counts = {k: 0 for k in NER_TARGETS.keys()}

        for ent in reversed(doc.ents):
            if ent.label_ in NER_TARGETS:
                if ent.text in LAYER1_PLACEHOLDERS:
                    continue

                placeholder = NER_TARGETS[ent.label_]
                redacted_text = (
                    redacted_text[: ent.start_char]
                    + placeholder
                    + redacted_text[ent.end_char :]
                )
                doc_counts[ent.label_] += 1

        new_bodies.append(redacted_text)
        for k, v in doc_counts.items():
            ner_global_counts[k] += v

    new_df = df.copy()
    new_df["body"] = new_bodies
    return new_df, ner_global_counts


################################################################################################################
# Layer 3 Key Redaction
KEY_REGEX_PATTERNS = {
    "[JWT]": re.compile(
        r"eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}"
    ),
    "[STRIPE_KEY]": re.compile(
        r"(?:^|(?<=\W))(?:sk|pk)_(?:live|test)_[a-zA-Z0-9]{20,40}(?=$|\W)"
    ),
    "[AWS_KEY_ID]": re.compile(r"(?:^|(?<=\W))AKIA[0-9A-Z]{16}(?=$|\W)"),
    "[UUID]": re.compile(
        r"(?:^|(?<=\W))[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}(?=$|\W)"
    ),
    "[LICENSE_KEY]": re.compile(
        r"(?:^|(?<=\W))([A-Z0-9]{4,6}-){3,}[A-Z0-9]{4,6}(?=$|\W)"
    ),
    "[API_KEY]": re.compile(
        r'(?i)\bapi[_-]?key\b\s*[:=]\s*[\'"]?([a-zA-Z0-9_\-]{20,})[\'"]?'
    ),
}

PLACEHOLDER_SET = {
    "[JWT]",
    "[STRIPE_KEY]",
    "[AWS_KEY_ID]",
    "[UUID]",
    "[LICENSE_KEY]",
    "[API_KEY]",
    "[SECRET]",
}


def _replace_span(text: str, start: int, end: int, repl: str) -> str:
    return text[:start] + repl + text[end:]


def _entropy(s: str) -> float:
    if not s:
        return 0.0
    freq = {}
    for ch in s:
        freq[ch] = freq.get(ch, 0) + 1
    n = len(s)
    return -sum((c / n) * math.log2(c / n) for c in freq.values())


GENERIC_SECRET_PATTERN = re.compile(
    r"(?<!\[)"
    r"(?<![A-Za-z0-9+/=])"
    r"([A-Za-z0-9_\-+/=]{24,})"
    r"(?![A-Za-z0-9_\-+/=])"
)


LHS_SECRETY_LINE = re.compile(
    r"""(?imx)             
    ^[ \t]*               
    (?:
        ["']?             
        (?P<name>
            [A-Za-z0-9_.\-]*     
            (?:                  
                key|secret|token|password|passwd|pwd|
                bearer|oauth|client[_-]?secret|
                api[_-]?key|access[_-]?key|
                private[_-]?key|service[_-]?account|
                refresh[_-]?token|auth
            )
            [A-Za-z0-9_.\-]*      
        )
        ["']?               
    )
    [ \t]*                  
    (?:
        [:=]                
        [ \t]*              
        (?:                 
            (?P<ph>\[(?:JWT|STRIPE_KEY|AWS_KEY_ID|UUID|LICENSE_KEY|API_KEY|SECRET)\])
            |
            (?P<val>[^,\n\r]*)
        )?
    )?
    (?P<trail>[ \t]*,?)?    
    $                      
    """
)


def redact_keys(text: str) -> Tuple[str, Dict[str, int]]:
    counts = {k: 0 for k in KEY_REGEX_PATTERNS.keys()}
    counts["[SECRET]"] = 0
    redacted = text

    for placeholder, pattern in KEY_REGEX_PATTERNS.items():
        matches = list(pattern.finditer(redacted))
        for m in reversed(matches):
            s, e = m.span()
            seg = redacted[s:e]
            if "[" in seg or "]" in seg:
                continue
            if placeholder == "[API_KEY]":
                vs, ve = m.span(1)
                redacted = _replace_span(redacted, vs, ve, "[API_KEY]")
            else:
                redacted = _replace_span(redacted, s, e, placeholder)
            counts[placeholder] += 1

    generic_matches = list(GENERIC_SECRET_PATTERN.finditer(redacted))
    for m in reversed(generic_matches):
        s, e = m.span(1)
        token = redacted[s:e]
        if token in PLACEHOLDER_SET or "[" in token or "]" in token:
            continue
        if token.isdigit():
            continue
        if _entropy(token) >= 3.2:
            redacted = _replace_span(redacted, s, e, "[SECRET]")
            counts["[SECRET]"] += 1

    def _mask_lhs(m: re.Match) -> str:
        counts["[SECRET]"] += 1
        trail = m.group("trail") or ""
        return f"[SECRET] = [SECRET]{trail}"

    redacted = LHS_SECRETY_LINE.sub(_mask_lhs, redacted)

    return redacted, counts


def layer_three_key_redaction(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, int]]:
    key_counts: Dict[str, int] = {k: 0 for k in KEY_REGEX_PATTERNS.keys()}
    key_counts["[SECRET]"] = 0

    body_results = df["body"].fillna("").apply(redact_keys)
    key_body = [r[0] for r in body_results]
    for _, c in body_results:
        for k, v in c.items():
            key_counts[k] += v

    df2 = df.copy()
    df2["body"] = key_body
    return df2, key_counts


#################################################################################################################
# Layer 4 Money and Number redaction
MONEY_PATTERN = re.compile(
    r"(?:USD|EUR|GBP|\$|€|£)\s*\d[\d,]*(?:\.\d+)?(?:K|M|B)?", re.IGNORECASE
)


def layer_money_redaction(df: pd.DataFrame) -> Tuple[pd.DataFrame, int]:
    money_counts = {"MONEY": 0}

    def _red_money(text: str):
        matches = list(MONEY_PATTERN.finditer(text))
        new_text = text
        for m in reversed(matches):
            start, end = m.span()
            money_counts["MONEY"] += 1
            new_text = new_text[:start] + "[MONEY]" + new_text[end:]
        return new_text

    dfm = df.copy()
    dfm["body"] = dfm["body"].fillna("").apply(_red_money)
    return dfm, money_counts["MONEY"]


NUM_PATTERN = re.compile(r"\b\d+(?:\.\d+)?(?!st|nd|rd|th)\b")
QUANTITY_SUFFIX_PATTERN = re.compile(r"\b\d+(?:\.\d+)?(?:K|M|B)\b", re.IGNORECASE)


def _red_num(text: str):
    new_text = text
    count = 0

    qty_matches = list(
        re.finditer(r"\b\d+(?:\.\d+)?(?:K|M|B)\b", new_text, re.IGNORECASE)
    )
    for m in reversed(qty_matches):
        start, end = m.span()
        token = m.group(0)
        suffix = token[-1]
        new_text = new_text[:start] + f"[NUM]{suffix}" + new_text[end:]
        count += 1

    pct_matches = list(re.finditer(r"\b\d+(?:\.\d+)?(?=%)", new_text))
    for m in reversed(pct_matches):
        start, end = m.span()
        number = new_text[start:end]
        new_text = new_text[:start] + "[NUM]" + new_text[end:]
        count += 1

    plain_matches = list(re.finditer(r"\b\d+(?:\.\d+)?\b", new_text))
    for m in reversed(plain_matches):
        start, end = m.span()
        number = new_text[start:end]

        if re.match(r"\d+(st|nd|rd|th)$", number, re.IGNORECASE):
            continue

        if number.startswith("[") and number.endswith("]"):
            continue

        new_text = new_text[:start] + "[NUM]" + new_text[end:]
        count += 1

    return new_text, count


def layer_num_redaction(df: pd.DataFrame) -> Tuple[pd.DataFrame, int]:
    number_counts = {"NUM": 0}
    dfn = df.copy()

    res_body = dfn["body"].fillna("").apply(_red_num)
    dfn["body"] = res_body.apply(lambda x: x[0])
    number_counts["NUM"] += sum(x[1] for x in res_body)

    return dfn, number_counts["NUM"]


def layer_four_number_redaction(
    df: pd.DataFrame,
) -> Tuple[pd.DataFrame, Dict[str, int]]:
    money_redacted_df, money_counts = layer_money_redaction(df)
    num_redacted_df, number_counts = layer_num_redaction(money_redacted_df)
    return num_redacted_df, {"MONEY": money_counts, "NUM": number_counts}


#################################################################################################################
# Layer 5 Final mixed token redaction
MIXED_TOKEN_PATTERN = re.compile(
    r"\b(?=[A-Za-z0-9]*[A-Za-z])(?=[A-Za-z0-9]*\d)[A-Za-z0-9][A-Za-z0-9\-_./]*[A-Za-z0-9]\b"
)
ORDINAL_PATTERN = re.compile(r"^\d+(st|nd|rd|th)$", re.IGNORECASE)


def _red_token(text: str):
    new_text = text
    count = 0

    matches = list(MIXED_TOKEN_PATTERN.finditer(text))
    for m in reversed(matches):
        token = m.group(0)

        if token.startswith("[") and token.endswith("]"):
            continue

        if ORDINAL_PATTERN.match(token):
            continue

        start, end = m.span()
        new_text = new_text[:start] + "[TOKEN]" + new_text[end:]
        count += 1

    return new_text, count


def layer_five_token_redaction(df: pd.DataFrame) -> Tuple[pd.DataFrame, int]:
    token_count = 0
    df5 = df.copy()

    res_body = df5["body"].fillna("").apply(_red_token)
    df5["body"] = res_body.apply(lambda x: x[0])
    token_count += sum(x[1] for x in res_body)

    return df5, token_count


FINAL_COUNT_KEYS = [
    "EMAIL",
    "PHONE",
    "SSN",
    "CREDIT_CARD",
    "IPV4",
    "IPV6",
    "MAC",
    "URL",
    "DATE",
    "ADDRESS",
    "ZIP",
    "HANDLE",
    "UUID",
    "PERSON",
    "ORG",
    "GPE",
    "LOC",
    "FAC",
    "LOCATION",
    "JWT",
    "STRIPE_KEY",
    "AWS_KEY_ID",
    "LICENSE_KEY",
    "API_KEY",
    "SECRET",
    "MONEY",
    "NUM",
    "TOKEN",
]


def _init_final_counts() -> Dict[str, int]:
    return {k: 0 for k in FINAL_COUNT_KEYS}


def _merge_counts(final_counts: Dict[str, int], layer_counts: Dict[str, int]) -> None:
    """
    Merge a layer's counts into the final_counts in-place.
    Normalizes bracketed keys like '[JWT]' -> 'JWT'.
    """
    if not layer_counts:
        return
    for k, v in layer_counts.items():
        norm = k.strip("[]")
        if norm in final_counts:
            final_counts[norm] += int(v or 0)


#################################################################################################################
# Full redaction pipeline
def strip_pii(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, int]]:
    logging.info("Starting PII Stripping Process.")
    
    required_cols = ['body']
    missing_cols = [col for col in required_cols if col not in df.columns]
    if missing_cols:
        raise ValueError(f"Input DataFrame is missing required columns: {missing_cols}")
    
    final_counts = _init_final_counts()

    df1, counts1 = layer_one_pii_redaction(df)
    _merge_counts(final_counts, counts1)

    df2, counts2 = layer_two_ner_redaction(df1)
    _merge_counts(final_counts, counts2)

    df3, counts3 = layer_three_key_redaction(df2)
    _merge_counts(final_counts, counts3)

    df4, counts4 = layer_four_number_redaction(df3)
    _merge_counts(final_counts, counts4)

    df5, token_count = layer_five_token_redaction(df4)
    _merge_counts(final_counts, {"TOKEN": token_count})

    df5['body'] = df5['body'].apply(normalize_text)
    logging.info("Completed PII Stripping Process and text normalization.")
    return df5, final_counts
