import html
import re
import unicodedata
from classification.model_config import BATCH_SIZE, CONFIDENCE_THRESHOLD
from classification.class_worker import celery_app
from common.logger import get_logger
from shared_worker_library.utils.task_definitions import TaskType, ClassificationModelResult
from typing import List, Dict
from common.security import decrypt_token
from shared_worker_library.utils.to_bytes import to_bytes
from classification.class_model import classify_email_stage
from classification.class_rules import classify_email_stage_by_rules

# Shared Queries
from shared_worker_library.db_queries.std_queries import get_encrypted_emails
from classification.class_queries import update_job_app_table

logging = get_logger()
MAX_RETRIES = 3

@celery_app.task(
    queue=TaskType.CLASSIFICATION_MODEL.queue_name, name=TaskType.CLASSIFICATION_MODEL.task_name
)
def classification_task(trace_id: str, row_ids: list, attempt: int = 1):
    """
    Orchestrates the email classification process for a batch of staged emails.

    Steps:
    1.  Fetches encrypted emails from the staging table using `row_ids`.
    2.  Decrypts the email content.
    3.  Normalizes the text for the model (HTML stripping, etc.).
    4.  Runs the classification model (zero-shot) to determine the application stage.
    5.  Writes the results to the `job_applications` table.

    Args:
        trace_id: Trace ID for logging.
        row_ids: List of database row IDs (uuids) from the staging table.
        attempt: Retry attempt counter.

    Returns:
        Dict with status 'success' or 'failure', and result count or error message.
    """
    logging.info(f"[{trace_id}] Starting classification task. Attempt {attempt}")

    no_rows_result = {
        "status": "success",
        "results": 0,
        "message": "No classification rows to process",
    }

    if not row_ids:
        logging.info(f"[{trace_id}] No row IDs provided; classification task skipped.")
        return no_rows_result
    
    if attempt > MAX_RETRIES:
        logging.error(f"[{trace_id}] Exceeded maximum retries for classification task.")
        return {"status": "failure", "result": "max_retries_exceeded"}
    
    try:
        # Fetch using raw SQL queries
        encrypted_emails = get_encrypted_emails(trace_id, row_ids)
        logging.info(f"[{trace_id}] Retrieved {len(encrypted_emails)} encrypted emails")
    except Exception as e:
        logging.error(f"[{trace_id}] Error fetching encrypted emails: {e}")
        return {"status": "failure", "error": str(e)}
    if not encrypted_emails:
        logging.info(f"[{trace_id}] No encrypted emails found; classification task skipped.")
        return no_rows_result

    try:
        decrypted_emails = decrypt_email_content(trace_id, encrypted_emails)
    except Exception as e:
        logging.error(f"[{trace_id}] Error decrypting emails: {e}")
        return {"status": "failure", "error": str(e)}
    if not decrypted_emails:
        logging.info(f"[{trace_id}] No decrypted emails available; classification task skipped.")
        return no_rows_result

    try:
        normalized_emails = normalized_emails_for_model(trace_id, decrypted_emails)
    except Exception as e:
        logging.error(f"[{trace_id}] Error normalizing emails: {e}")
        return {"status": "failure", "error": str(e)}
    if not normalized_emails:
        logging.info(f"[{trace_id}] No normalized emails available; classification task skipped.")
        return no_rows_result

    try:
        model_results = run_classification_model(trace_id, normalized_emails)
    except Exception as e:
        logging.error(f"[{trace_id}] Error running classification model: {e}")
        return {"status": "failure", "error": str(e)}

    try:
        # Write using raw SQL queries
        result = update_job_app_table(trace_id, model_results)
        if result["status"] == "failure":
            raise Exception(result.get("error", "Unknown database error"))
        
        count = result.get("rows_affected", 0)
        logging.info(f"[{trace_id}] Updated {count} job_applications rows successfully.")
    except Exception as e:
        logging.error(f"[{trace_id}] Error updating job_applications table: {e}")
        return {"status": "failure", "error": str(e)}

    logging.info(f"[{trace_id}] Classification task completed successfully")
    return {"status": "success", "results": count}

def decrypt_email_content(trace_id: str, encrypted_emails: List[Dict]) -> List[Dict]:
    """
    Decrypts sensitive fields (subject, sender, body) from a list of email dictionaries.

    Args:
        trace_id: Trace ID for logging.
        encrypted_emails: List of dicts containing encrypted content.

    Returns:
        A list of dictionaries with decrypted content.
    """
    logging.debug(f"[{trace_id}] Decrypting email content")
    decrypted_emails = []
    for email in encrypted_emails:
        try:
            decrypted_emails.append(
                {
                    "id": email["id"],
                    "subject": decrypt_token(to_bytes(email["subject_enc"])),
                    "sender": decrypt_token(to_bytes(email["sender_enc"])),
                    "body": decrypt_token(to_bytes(email["body_enc"])),
                    "provider_message_id": email["provider_message_id"],
                }
            )
        except Exception as e:
            logging.error(f"[{trace_id}] Error decrypting email ID {email.get('id')}: {e}")
    return decrypted_emails

def normalized_emails_for_model(trace_id: str, emails: list[dict]) -> list[dict]:
    """
    Prepares email text for the classification model.

    Performs normalization:
    - HTML unescaping and tag removal.
    - URL and Email masking.
    - Unicode normalization.
    - Whitespace collapsing.
    - Lowercasing.

    Args:
        trace_id: Trace ID for logging.
        emails: List of dicts containing 'subject', 'sender', 'body'.

    Returns:
        List of dicts with normalized text fields.
    """
    logging.debug(f"[{trace_id}] Normalizing {len(emails)} emails")
    
    def normalize_text(text: str) -> str:
        if text is None:
            return ""
        text = str(text)
        text = html.unescape(text)
        text = re.sub(r'<[^>]+>', ' ', text)
        text = re.sub(r'http\S+|www\S+|https\S+', ' URL ', text, flags=re.IGNORECASE)
        text = re.sub(r"\b[\w.-]+?@\w+?\.\w+?\b", " EMAIL_ADDRESS ", text, flags=re.IGNORECASE)
        text = unicodedata.normalize('NFKC', text)
        text = re.sub(r"\s+", " ", text)
        text = text.lower().strip()
        return text
    
    normalized = []
    for email in emails:
        try:
            subject = normalize_text(email.get("subject", ""))
            sender = normalize_text(email.get("sender", ""))
            body = normalize_text(email.get("body", ""))

            normalized.append({
                "id": email["id"],
                "subject": subject,
                "sender": sender,
                "body": body,
                "provider_message_id": email["provider_message_id"],
            })
        except Exception as e:
            logging.error(f"[{trace_id}] Error normalizing email ID {email['id']}: {e}")

    logging.debug(f"[{trace_id}] Email normalization completed")
    return normalized

def heuristic_labeling(text: str) -> str | None:
    """
    Applies keyword-based heuristics to verify or correct model predictions.

    Args:
        text: The normalized email text.

    Returns:
        A stage label string if a keyword match is found, otherwise None.
    """
    if not text: return None
    text_lower = text.lower()
    mappings = {
        "applied" : ["application received", "application submitted", "application for", "applied for", "application confirmation"],
        "interview" : ["interview scheduled", "interview confirmed", "interview invitation", "schedule an interview"],
        "offer" : ["job offer", "offer letter", "extended an offer", "formal offer", "congratulations on your offer"],
        "accepted" : ["offer accepted", "joining date confirmed", "signed offer", "start date confirmed"],
        "rejected" : ["application rejected", "not selected", "not moving forward", "position filled", "application unsuccessful"]
    }
    for label, keywords in mappings.items():
        for kw in keywords:
            if kw in text_lower:
                return label
    return None

def run_classification_model(trace_id: str, emails: list[dict]) -> ClassificationModelResult:
    """
    Runs each email through the zero-shot classifier and applies logic to determine the best stage label.

    - Calls `classify_email_stage`.
    - applies heuristic checks.
    - Flags low-confidence results for manual review.
    - Groups results by stage (Applied, Interview, etc.).

    Args:
        trace_id: Trace ID for logging.
        emails: List of normalized email dictionaries.

    Returns:
        A ClassificationModelResult object containing grouped results.
    """
    logging.info(f"[{trace_id}] Running classification model on {len(emails)} emails")

    applied = []
    interview = []
    offer = []
    accepted = []
    rejected = []
    retry = []

    if not emails:
        logging.info(f"[{trace_id}] No emails provided to classification model.")
        return ClassificationModelResult(
            applied=applied,
            interview=interview,
            offer=offer,
            accepted=accepted,
            rejected=rejected,
            retry=retry,
        )

    for i in range(0, len(emails), BATCH_SIZE):
        batch = emails[i:i + BATCH_SIZE]
        batch_num = (i // BATCH_SIZE) + 1
        total_batches = (len(emails) + BATCH_SIZE - 1) // BATCH_SIZE
        logging.debug(f"[{trace_id}] Processing batch {batch_num}/{total_batches}")

        for email in batch:
            email_text = f"Subject: {email['subject']} \nFrom: {email['sender']} \nBody: {email['body']}"
            try:
                rule_out = classify_email_stage_by_rules(
                    subject=email["subject"],
                    sender=email["sender"],
                    body=email["body"],
                    email_text=email_text,
                )
                if rule_out.get("matched"):
                    model_out = rule_out
                    source = "rules"
                else:
                    model_out = classify_email_stage(email_text)
                    source = "deberta"
            except Exception as e:
                logging.error(f"[{trace_id}] Model error for email {email['id']}: {e}")
                retry.append({"email_id": email["id"]})
                continue

            try:
                top_label = model_out.get("stage")
                top_score = model_out.get("score", 0)
                second_label = model_out.get("second_stage")
                second_score = model_out.get("second_score", 0)

                logging.info(
                    f"[{trace_id}] Classification source={source} stage={top_label} "
                    f"score={float(top_score):.3f} provider_message_id={email['provider_message_id']}"
                )

                h_label = heuristic_labeling(email_text)
                needs_review = False

                if top_score < CONFIDENCE_THRESHOLD:
                    needs_review = True
                if second_score is not None and abs(top_score - second_score) < .1:
                    needs_review = True

                final_label = top_label

                if h_label:
                    if h_label == top_label:
                        final_label = top_label
                    elif h_label == second_label:
                        final_label = second_label
                        needs_review = True
                    else:
                        needs_review = True

                if final_label == second_label and second_label is not None:
                    top_label, second_label = second_label, top_label
                    top_score, second_score = second_score, top_score

                logging.debug(f"[{trace_id}] Email {email['id']}: {top_label} (confidence: {top_score:.3f})")
                    
                out_item = {
                    "email_id": email["id"],
                    "provider_message_id": email["provider_message_id"],
                    "confidence": top_score,
                    "top_label": top_label,
                    "top_score": top_score,
                    "second_label": second_label,
                    "second_score": second_score,
                    "needs_review": bool(needs_review),
                    "stage_scores": model_out.get("stage_scores"),
                }

                if final_label == "applied": applied.append(out_item)
                elif final_label == "interview": interview.append(out_item)
                elif final_label == "offer": offer.append(out_item)
                elif final_label == "accepted": accepted.append(out_item)
                elif final_label == "rejected": rejected.append(out_item)

            except Exception as e:
                logging.error(f"[{trace_id}] Error processing email {email['id']}: {e}")
                retry.append({"email_id": email["id"]})

    logging.info(f"[{trace_id}] Classification results: applied={len(applied)}, interview={len(interview)}, offer={len(offer)}, accepted={len(accepted)}, rejected={len(rejected)}, retry={len(retry)}")

    return ClassificationModelResult(applied=applied, interview=interview, offer=offer, accepted=accepted, rejected=rejected, retry=retry)
