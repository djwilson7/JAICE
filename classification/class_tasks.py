import html
import os
import re
import unicodedata
from classification.class_worker import celery_app
from common.logger import get_logger
from shared_worker_library.utils.task_definitions import TaskType, ClassificationModelResult
from typing import List, Dict, Optional
from common.security import decrypt_token
from shared_worker_library.utils.to_bytes import to_bytes
from classification.class_rules import INTERNAL_TO_STAGE, classify_email_by_rules
from classification.llm_classifier import (
    EmailLLMClassifierError,
    EmailLLMTransientError,
    classify_email_with_ollama,
)

# Shared Queries
from shared_worker_library.db_queries.std_queries import get_encrypted_emails
from shared_worker_library.db_queries.job_application_queries import (
    delete_staging_job_applications,
    get_stale_processing_staging_row_ids,
    mark_staging_job_applications_for_review,
)
from classification.class_queries import update_job_app_table

logging = get_logger()
MAX_RETRIES = 3
BATCH_SIZE = 1
CONFIDENCE_THRESHOLD = 0.6
LLM_CONFIDENCE_THRESHOLD = 0.65
LLM_MARGIN_THRESHOLD = 0.10
STALE_PROCESSING_MINUTES = int(os.getenv("EMAIL_STALE_PROCESSING_MINUTES", "5"))
STALE_PROCESSING_LIMIT = int(os.getenv("EMAIL_STALE_PROCESSING_LIMIT", "50"))

@celery_app.task(
    queue=TaskType.CLASSIFICATION_MODEL.queue_name,
    name=TaskType.CLASSIFICATION_MODEL.task_name,
    acks_late=True,
    reject_on_worker_lost=True,
)
def classification_task(trace_id: str, row_ids: list, attempt: int = 1):
    """
    Orchestrates the email classification process for a batch of staged emails.

    Steps:
    1.  Fetches encrypted emails from the staging table using `row_ids`.
    2.  Decrypts the email content.
    3.  Normalizes the text for the model (HTML stripping, etc.).
    4.  Runs rule filtering and classification to determine the application stage.
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
        result = update_job_app_table(trace_id, model_results)
        if result["status"] == "failure":
            raise Exception(result.get("error", "Unknown database error"))

        cleanup_non_job_results(trace_id, model_results.not_job_related)
        enqueue_inference(trace_id, model_results.inference)
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

def heuristic_labeling(text: str) -> Optional[str]:
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
    Runs each email through rule filtering/classification.

    - Flags low-confidence results for manual review.
    - Groups results by stage (Applied, Interview, etc.).
    - Routes ambiguous rows to Ollama inference.

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
    inference = []
    not_job_related = []

    if not emails:
        logging.info(f"[{trace_id}] No emails provided to classification model.")
        return ClassificationModelResult(
            applied=applied,
            interview=interview,
            offer=offer,
            accepted=accepted,
            rejected=rejected,
            retry=retry,
            inference=inference,
            not_job_related=not_job_related,
        )

    for i in range(0, len(emails), BATCH_SIZE):
        batch = emails[i:i + BATCH_SIZE]
        batch_num = (i // BATCH_SIZE) + 1
        total_batches = (len(emails) + BATCH_SIZE - 1) // BATCH_SIZE
        logging.debug(f"[{trace_id}] Processing batch {batch_num}/{total_batches}")

        for email in batch:
            email_text = f"Subject: {email['subject']} \nFrom: {email['sender']} \nBody: {email['body']}"
            try:
                model_out = classify_email_by_rules(
                    subject=email["subject"],
                    sender=email["sender"],
                    body=email["body"],
                    email_text=email_text,
                )
            except Exception as e:
                logging.error(f"[{trace_id}] Rule classification error for email {email['id']}: {e}")
                retry.append({"email_id": email["id"], "reason": "rule_error"})
                continue

            try:
                if model_out.get("category") == "NOT_JOB_RELATED" or model_out.get("relevant") is False:
                    not_job_related.append(
                        {
                            "email_id": email["id"],
                            "provider_message_id": email["provider_message_id"],
                            "reason": model_out.get("reason", "not_job_related"),
                        }
                    )
                    logging.info(
                        f"[{trace_id}] Classification source=rules category=NOT_JOB_RELATED "
                        f"provider_message_id={email['provider_message_id']}"
                    )
                    continue

                if model_out.get("requires_inference") or not model_out.get("matched"):
                    inference.append(
                        {
                            "email_id": email["id"],
                            "provider_message_id": email["provider_message_id"],
                            "reason": model_out.get("reason", "requires_inference"),
                        }
                    )
                    logging.info(
                        f"[{trace_id}] Classification source=rules stage=UNKNOWN "
                        f"provider_message_id={email['provider_message_id']} queued_for_inference=True"
                    )
                    continue

                top_label = model_out.get("stage")
                top_score = model_out.get("score", 0)
                second_label = model_out.get("second_stage")
                second_score = model_out.get("second_score", 0)

                logging.info(
                    f"[{trace_id}] Classification source=rules stage={top_label} "
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
                    "category": model_out.get("category"),
                    "category_scores": model_out.get("category_scores"),
                }

                if final_label == "applied": applied.append(out_item)
                elif final_label == "interview": interview.append(out_item)
                elif final_label == "offer": offer.append(out_item)
                elif final_label == "accepted": accepted.append(out_item)
                elif final_label == "rejected": rejected.append(out_item)

            except Exception as e:
                logging.error(f"[{trace_id}] Error processing email {email['id']}: {e}")
                retry.append({"email_id": email["id"]})

    logging.info(
        f"[{trace_id}] Classification results: applied={len(applied)}, "
        f"interview={len(interview)}, offer={len(offer)}, accepted={len(accepted)}, "
        f"rejected={len(rejected)}, inference={len(inference)}, "
        f"not_job_related={len(not_job_related)}, retry={len(retry)}"
    )

    return ClassificationModelResult(
        applied=applied,
        interview=interview,
        offer=offer,
        accepted=accepted,
        rejected=rejected,
        retry=retry,
        inference=inference,
        not_job_related=not_job_related,
    )


def cleanup_non_job_results(trace_id: str, rows: list[dict]) -> dict:
    provider_message_ids = [
        row["provider_message_id"]
        for row in rows
        if row.get("provider_message_id")
    ]
    return delete_staging_job_applications(trace_id, provider_message_ids)


def enqueue_inference(trace_id: str, rows: list[dict]) -> dict:
    row_ids = [row["email_id"] for row in rows if row.get("email_id")]
    if not row_ids:
        return {"queued": 0}
    celery_app.send_task(
        TaskType.EMAIL_INFERENCE.task_name,
        args=[trace_id, row_ids],
        queue=TaskType.EMAIL_INFERENCE.queue_name,
    )
    return {"queued": len(row_ids)}


def schedule_inference_retry(
    trace_id: str,
    row_ids: list,
    attempt: int,
    error: Exception | str,
) -> dict:
    if attempt >= MAX_RETRIES:
        logging.error(
            f"[{trace_id}] Email inference retry exhausted for {len(row_ids)} row(s): {error}"
        )
        return {"status": "failure", "error": str(error), "retry": 0}

    countdown = (2 ** (attempt - 1)) * 60
    email_inference_task.apply_async(
        args=[trace_id, row_ids, attempt + 1],
        countdown=countdown,
        queue=TaskType.EMAIL_INFERENCE.queue_name,
    )
    logging.warning(
        f"[{trace_id}] Email inference retry scheduled for {len(row_ids)} row(s) "
        f"in {countdown}s on attempt {attempt + 1}: {error}"
    )
    return {
        "status": "retry_scheduled",
        "retry": len(row_ids),
        "attempt": attempt + 1,
        "error": str(error),
    }


@celery_app.task(
    queue=TaskType.REQUEUE_STALE_EMAIL_INFERENCE.queue_name,
    name=TaskType.REQUEUE_STALE_EMAIL_INFERENCE.task_name,
    acks_late=True,
    reject_on_worker_lost=True,
)
def requeue_stale_email_inference_task(
    trace_id: str,
    older_than_minutes: int = STALE_PROCESSING_MINUTES,
    limit: int = STALE_PROCESSING_LIMIT,
):
    row_ids = get_stale_processing_staging_row_ids(
        trace_id,
        older_than_minutes=older_than_minutes,
        limit=limit,
    )
    if not row_ids:
        return {"status": "success", "queued": 0}

    retry_rows = [{"email_id": row_id} for row_id in row_ids]
    result = enqueue_inference(trace_id, retry_rows)
    return {"status": "success", **result}


@celery_app.task(
    queue=TaskType.EMAIL_INFERENCE.queue_name,
    name=TaskType.EMAIL_INFERENCE.task_name,
    acks_late=True,
    reject_on_worker_lost=True,
)
def email_inference_task(trace_id: str, row_ids: list, attempt: int = 1):
    logging.info(f"[{trace_id}] Starting email inference task. Attempt {attempt}")

    no_rows_result = {
        "status": "success",
        "results": 0,
        "message": "No inference rows to process",
    }
    if not row_ids:
        return no_rows_result

    try:
        encrypted_emails = get_encrypted_emails(trace_id, row_ids)
    except Exception as e:
        logging.error(f"[{trace_id}] Error fetching inference emails: {e}")
        return schedule_inference_retry(trace_id, row_ids, attempt, e)
    if not encrypted_emails:
        return no_rows_result

    try:
        decrypted_emails = decrypt_email_content(trace_id, encrypted_emails)
    except Exception as e:
        logging.error(f"[{trace_id}] Error decrypting inference emails: {e}")
        provider_message_ids = [
            email["provider_message_id"]
            for email in encrypted_emails
            if email.get("provider_message_id")
        ]
        if attempt >= MAX_RETRIES:
            mark_staging_job_applications_for_review(trace_id, provider_message_ids)
            return {"status": "failure", "error": str(e), "review": len(provider_message_ids)}
        return schedule_inference_retry(trace_id, row_ids, attempt, e)
    try:
        normalized_emails = normalized_emails_for_model(trace_id, decrypted_emails)
    except Exception as e:
        logging.error(f"[{trace_id}] Error normalizing inference emails: {e}")
        provider_message_ids = [
            email["provider_message_id"]
            for email in decrypted_emails
            if email.get("provider_message_id")
        ]
        if attempt >= MAX_RETRIES:
            mark_staging_job_applications_for_review(trace_id, provider_message_ids)
            return {"status": "failure", "error": str(e), "review": len(provider_message_ids)}
        return schedule_inference_retry(trace_id, row_ids, attempt, e)
    if not normalized_emails:
        return no_rows_result

    model_results = ClassificationModelResult([], [], [], [], [], [])
    review_provider_message_ids = []
    retry_ids = []

    for email in normalized_emails:
        email_text = f"Subject: {email['subject']} \nFrom: {email['sender']} \nBody: {email['body']}"
        try:
            llm_out = classify_email_with_ollama(email_text)
            item = build_llm_result_item(email, llm_out)
        except EmailLLMTransientError as e:
            logging.warning(
                f"[{trace_id}] Ollama transient failure for "
                f"provider_message_id={email['provider_message_id']}: {e}"
            )
            if attempt < MAX_RETRIES:
                retry_ids.append(email["id"])
            else:
                review_provider_message_ids.append(email["provider_message_id"])
            continue
        except EmailLLMClassifierError as e:
            logging.warning(
                f"[{trace_id}] Ollama classification output rejected for "
                f"provider_message_id={email['provider_message_id']}: {e}"
            )
            review_provider_message_ids.append(email["provider_message_id"])
            continue

        if item is None:
            review_provider_message_ids.append(email["provider_message_id"])
            continue

        if item.get("category") == "NOT_JOB_RELATED":
            model_results.not_job_related.append(item)
            continue

        stage = item.get("top_label")
        if stage == "applied":
            model_results.applied.append(item)
        elif stage == "interview":
            model_results.interview.append(item)
        elif stage == "offer":
            model_results.offer.append(item)
        elif stage == "accepted":
            model_results.accepted.append(item)
        elif stage == "rejected":
            model_results.rejected.append(item)
        else:
            review_provider_message_ids.append(email["provider_message_id"])

    update_result = update_job_app_table(trace_id, model_results)
    if update_result.get("status") == "failure":
        return schedule_inference_retry(
            trace_id,
            row_ids,
            attempt,
            update_result.get("error", "database update failed"),
        )

    cleanup_non_job_results(trace_id, model_results.not_job_related)
    mark_staging_job_applications_for_review(trace_id, review_provider_message_ids)

    if retry_ids:
        schedule_inference_retry(
            trace_id,
            retry_ids,
            attempt,
            "transient Ollama failure",
        )

    return {
        "status": "success",
        "results": update_result.get("rows_affected", 0),
        "retry": len(retry_ids),
        "review": len(review_provider_message_ids),
    }


def build_llm_result_item(email: dict, llm_out: dict) -> Optional[dict]:
    category = llm_out["category"]
    confidence = float(llm_out["confidence"])
    secondary_category = llm_out.get("secondary_category")
    secondary_confidence = float(llm_out.get("secondary_confidence") or 0.0)

    if category == "UNKNOWN":
        return None
    if confidence < LLM_CONFIDENCE_THRESHOLD:
        return None
    if confidence - secondary_confidence < LLM_MARGIN_THRESHOLD:
        return None

    if category == "NOT_JOB_RELATED":
        return {
            "email_id": email["id"],
            "provider_message_id": email["provider_message_id"],
            "category": category,
            "reason": llm_out.get("reason"),
        }

    stage = INTERNAL_TO_STAGE.get(category)
    if not stage:
        return None

    return {
        "email_id": email["id"],
        "provider_message_id": email["provider_message_id"],
        "confidence": confidence,
        "top_label": stage,
        "top_score": confidence,
        "second_label": INTERNAL_TO_STAGE.get(secondary_category),
        "second_score": secondary_confidence,
        "needs_review": False,
        "stage_scores": None,
        "category": category,
    }
