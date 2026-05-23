from relevance.relevance_worker import celery_app
from common.logger import get_logger
from shared_worker_library.utils.task_definitions import (
    TaskType,
    RelevanceModelResult,
)
from relevance.relevance_queries import update_job_app_table
from shared_worker_library.db_queries.std_queries import get_encrypted_emails
from common.security import decrypt_token
from typing import List, Dict, cast
from shared_worker_library.utils.to_bytes import to_bytes
import pandas as pd
from relevance.relevance_norm import strip_pii
from relevance.relevance_model import predict

logging = get_logger()
MAX_RETRIES = 3
MODEL_CONFIDENCE_THRESHOLD = 0.8


@celery_app.task(
    queue=TaskType.RELEVANCE_MODEL.queue_name, name=TaskType.RELEVANCE_MODEL.task_name
)
def relevance_task(trace_id: str, row_ids: list, attempt: int = 1):
    """
    Core pipeline task for determining email relevance to job applications.

    Process flow:
    1.  Fetch: Retrieves encrypted emails from staging.
    2.  Decrypt: Decrypts content (subject, body) for analysis.
    3.  Normalize: Strips PII and normalizes text for the model.
    4.  Predict: Runs the DistilBert relevance model.
    5.  Update: Inserts relevant emails into the `job_applications` table.
    6.  Enqueue: Routes relevant emails to classification, or schedules retries.

    Args:
        trace_id: Unique trace ID for request tracking.
        row_ids: List of temporary staging IDs to process.
        attempt: Current retry attempt number.
    """
    logging.info(f"[{trace_id}] Starting relevance task. Attempt {attempt}")

    if attempt > MAX_RETRIES:
        logging.error(f"[{trace_id}] Exceeded maximum retries for relevance task.")
        return {"status": "failure", "result": "max_retries_exceeded"}

    try:
        encrypted_emails = get_encrypted_emails(trace_id, row_ids)
    except Exception as e:
        logging.error(f"[{trace_id}] Error fetching encrypted emails: {e}")
        return {"status": "failure", "error": str(e)}

    try:
        decrypted_emails = decrypt_email_content(trace_id, encrypted_emails)
    except Exception as e:
        logging.error(f"[{trace_id}] Error decrypting emails: {e}")
        return {"status": "failure", "error": str(e)}

    try:
        normalized_emails = normalized_emails_for_model(trace_id, decrypted_emails)
    except Exception as e:
        logging.error(f"[{trace_id}] Error normalizing emails: {e}")
        return {"status": "failure", "error": str(e)}

    try:
        model_results = run_relevance_model(trace_id, normalized_emails)
    except Exception as e:
        logging.error(f"[{trace_id}] Error running relevance model: {e}")
        return {"status": "failure", "error": str(e)}

    try:
        _ = update_job_app_table(trace_id, model_results)
    except Exception as e:
        logging.error(f"[{trace_id}] Error updating job app table: {e}")
        return {"status": "failure", "error": str(e)}

    try:
        _ = enqueue(trace_id, model_results, attempt)
    except Exception as e:
        logging.error(f"[{trace_id}] Error splitting and enqueueing results: {e}")
        return {"status": "failure", "error": str(e)}

    logging.info(f"[{trace_id}] Relevance task completed successfully")
    return {
        "status": "success",
        "results": f"Relevant Count: {len(model_results.relevant)}, Retry Count: {len(model_results.retry)}, Purge Count: {len(model_results.purge)}",
    }


def decrypt_email_content(trace_id: str, encrypted_emails: List[Dict]) -> List[Dict]:
    logging.debug(f"[{trace_id}] Decrypting email content")
    decrypted_emails = []
    for email in encrypted_emails:
        try:
            decrypted_emails.append(
                {
                    "id": email["id"],
                    "body": decrypt_token(to_bytes(email["body_enc"])),
                    "subject": decrypt_token(to_bytes(email["subject_enc"])),
                }
            )
        except Exception as e:
            logging.error(f"[{trace_id}] Error decrypting email ID {email['id']}: {e}")

    return decrypted_emails


def normalized_emails_for_model(trace_id: str, emails: list[dict]) -> pd.DataFrame:
    """
    Converts decrypted emails to a DataFrame and applies PII redaction.

    Args:
        trace_id: Trace ID for logging.
        emails: List of email dictionaries.

    Returns:
        A pandas DataFrame with a 'body' column containing redacted/normalized text.
    """
    logging.debug(f"[{trace_id}] Normalizing {len(emails)} emails")
    df = pd.DataFrame(emails)
    df_normalized, redaction_counts = strip_pii(df)
    return df_normalized


def run_relevance_model(trace_id: str, emails: pd.DataFrame) -> RelevanceModelResult:
    """
    Executes the relevance prediction model on the normalized email data.

    Args:
        trace_id: Trace ID for logging.
        emails: DataFrame containing prepared email text.

    Returns:
        A RelevanceModelResult object separating relevant, retryable, and purgeable IDs.
    """
    logging.info(f"[{trace_id}] Running relevance model.")

    relevant = {}
    retry = []
    purge = []

    try:
        data = predict(emails)
        logging.debug(f"[{trace_id}] Model predictions complete: {len(data)} results")

        relevant: Dict[str, float] = {
            str(row.id): cast(float, row.job_probability)
            for row in data.itertuples(index=False)
            if row.prediction == 1
        }

        purge = data.loc[data["prediction"] == 0, "id"].astype(str).tolist()

    except Exception as e:
        logging.error(f"[{trace_id}] Error processing email: {e}")
        retry.extend(emails["id"].tolist())
        relevant = {}
        purge = []

    return RelevanceModelResult(relevant=relevant, retry=retry, purge=purge)


def enqueue(trace_id: str, model_results: RelevanceModelResult, attempt: int):
    logging.info(f"[{trace_id}] Splitting and enqueueing results.")
    # This function sends tasks to the proper queues based on model results.
    relevant_ids = list(model_results.relevant.keys())
    retry_ids = [str(email_id) for email_id in model_results.retry]
    purge_ids = [str(email_id) for email_id in model_results.purge]

    # Enqueue relevant emails for classification model
    if relevant_ids:
        celery_app.send_task(
            TaskType.CLASSIFICATION_MODEL.task_name,
            args=[trace_id, relevant_ids],
            queue=TaskType.CLASSIFICATION_MODEL.queue_name,
        )

    # Enqueue retry emails back to relevance model with incremented attempt
    if retry_ids:
        countdown = (2 ** (attempt - 1)) * 60
        relevance_task.apply_async(
            args=[trace_id, retry_ids, attempt + 1], countdown=countdown
        )

    # Log relevance task enqueueing summary
    logging.info(
        f"[{trace_id}] Next stage: {len(relevant_ids)} for classification, {len(retry_ids)} retrying, {len(purge_ids)} purged"
    )

    return {
        "relevant": relevant_ids,
        "retry": retry_ids,
        "purge": purge_ids,
        "attempt_next": attempt + 1 if retry_ids else attempt,
    }
