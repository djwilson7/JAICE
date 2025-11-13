import html
import re
import unicodedata
from classification.model_config import BATCH_SIZE, CONFIDENCE_THRESHOLD
from classification.class_worker import celery_app
from common.logger import get_logger
from shared_worker_library.utils.task_definitions import TaskType, ClassificationModelResult
from shared_worker_library.db_queries.std_queries import get_encrypted_emails, update_staging_table_failure
from classification.class_queries import update_job_app_table
from typing import List, Dict
from common.security import decrypt_token
from shared_worker_library.utils.to_bytes import to_bytes
from classification.class_model import classify_email_stage

logging = get_logger()
MAX_RETRIES = 3

@celery_app.task(
    queue=TaskType.CLASSIFICATION_MODEL.queue_name, name=TaskType.CLASSIFICATION_MODEL.task_name
)
def classification_task(trace_id: str, row_ids: list, attempt: int = 1):
    logging.info(f"[{trace_id}] Starting classification task. Attempt {attempt}")
    
    if attempt > MAX_RETRIES:
        logging.error(f"[{trace_id}] Exceeded maximum retries for classification task.")
        result = update_staging_table_failure(trace_id, row_ids)
        return {"status": "failure", "result": result}
    
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
        model_results = run_classification_model(trace_id, normalized_emails)
    except Exception as e:
        logging.error(f"[{trace_id}] Error running classification model: {e}")
        return {"status": "failure", "error": str(e)}

    try:
        results = update_job_app_table(trace_id, model_results)
    except Exception as e:
        logging.error(f"[{trace_id}] Error updating job_applications table: {e}")
        return {"status": "failure", "error": str(e)}

    # There is no longer a need to enqueue further tasks from here
    # Classification and NER run concurrently on the raw staging data and update the job_applications table directly.

    logging.info(f"[{trace_id}] Classification task completed successfully")
    return {"status": "success", "results": results}

def decrypt_email_content(trace_id: str, encrypted_emails: List[Dict]) -> List[Dict]:
    logging.info(f"[{trace_id}] Decrypting email content")
    # This will need to be optimized to only create the necessary decrypted fields for the classification model.
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
            logging.error(f"[{trace_id}] Error decrypting email ID {email['id']}: {e}")
    return decrypted_emails

def normalized_emails_for_model(trace_id: str, emails: list[dict]) -> list[dict]:
    logging.warning(f"[{trace_id}] Normalizing emails for model.")
    # All content for the row is pulled into the emails list. This will later be optimized to only pull necessary fields for the relevance model.
    # {
    #     "id",                     -> Generated for the staging table
    #     "subject",                -> email subject
    #     "sender",                 -> email sender
    #     "body",                   -> email body content
    #     "provider_message_id"     -> unique email identifier from provider used to map directly into the job applications table
    # }
    
    def normalize_text(text: str) -> str:
        if text is None:
            return ""
        
        # ensure text is str
        text = str(text)

        # unescape html entities
        text = html.unescape(text)

        # remoce html tags
        text = re.sub(r'<[^>]+>', ' ', text)

        # replace urls with token
        text = re.sub(r'http\S+|www\S+|https\S+', ' URL ', text, flags=re.IGNORECASE)

        # replace email addresses with token
        text = re.sub(r"\b[\w.-]+?@\w+?\.\w+?\b", " EMAIL_ADDRESS ", text, flags=re.IGNORECASE)

        # normalize unicode characters
        text = unicodedata.normalize('NFKC', text)

        # collapse repetitive whitespace
        text = re.sub(r"\s+", " ", text)

        # lowercase and srip leading/trailing whitespace
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

    logging.info(f"[{trace_id}] Email normalization completed successfully.")
    return normalized

def heuristic_labeling(text: str) -> str | None:
    """ Apply heuristic rules to check the model output for obvious misclassifications."""

    if not text:
        return None
    
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
    logging.warning(f"[{trace_id}] Running classification model on {len(emails)} emails")

    applied = []
    interview = []
    offer = []
    accepted = []
    rejected = []
    retry = []

    
    for i in range(0, len(emails), BATCH_SIZE):
        batch = emails[i:i + BATCH_SIZE]
        batch_num = (i // BATCH_SIZE) + 1
        total_batches = (len(emails) + BATCH_SIZE - 1) // BATCH_SIZE
        logging.info(f"[{trace_id}] Processing batch {batch_num}/{total_batches}: {len(batch)} emails")

        for email in batch:
            email_text = f"Subject: {email['subject']} \nFrom: {email['sender']} \nBody: {email['body']}"
            try:
                model_out = classify_email_stage(email_text)
            except Exception as e:
                logging.error(f"[{trace_id}] Model error for email {email['id']}: {e}")

                # schedule this email for retry
                retry.append({"email_id": email["id"]})
                continue


            try:
                top_label = model_out.get("stage")
                top_score = model_out.get("score", 0)
                second_label = model_out.get("second_stage")
                second_score = model_out.get("second_score", 0)

                # run heuristic labeling
                h_label = heuristic_labeling(email_text)

                # decide if it needs review
                needs_review = False

                # if low confidence mark as needs review
                if top_score < CONFIDENCE_THRESHOLD:
                    needs_review = True

                # if the two top scores are close mark as needs review
                if second_score is not None and abs(top_score - second_score) < .1:
                    needs_review = True

                # make final label decision
                final_label = top_label

                # apply heuristic label adjustments
                if h_label:
                    # if heuristic label matches top label keep the final label the same
                    if h_label == top_label:
                        final_label = top_label

                    # if heuristic label matches second label change it to the second label and mark for review
                    elif h_label == second_label:
                        final_label = second_label
                        needs_review = True

                    # if heuristic label is different from both of the models labels keep it the same but mark as needs review
                    else:
                        needs_review = True

                # if the final label is the second label, swap the top and second labels/scores
                if final_label == second_label and second_label is not None:
                    top_label, second_label = second_label, top_label
                    top_score, second_score = second_score, top_score

                # log email body with classification result
                logging.info(f"[{trace_id}] Email ID: {email['id']} | Classification: {top_label} | Confidence: {top_score:.3f}")
                logging.info(f"[{trace_id}] Subject: {email['subject']}")
                logging.info(f"[{trace_id}] Body: {email['body']}")
                logging.info("-----------------------------------------------------")  
                    
                # prepare output item
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

                # sort into list based on predicted label
                if final_label == "applied":
                    applied.append(out_item)

                elif final_label == "interview":
                    interview.append(out_item)

                elif final_label == "offer":
                    offer.append(out_item)

                elif final_label == "accepted":
                    accepted.append(out_item)

                elif final_label == "rejected":
                    rejected.append(out_item)

            except Exception as e:
                logging.error(f"[{trace_id}] Error processing email {email['id']}: {e}")
                retry.append({"email_id": email["id"]})

    # Log classification results summary
    logging.info(f"[{trace_id}] Classification results: applied={len(applied)}, interview={len(interview)}, offer={len(offer)}, accepted={len(accepted)}, rejected={len(rejected)}, retry={len(retry)}")

    return ClassificationModelResult(applied=applied, interview=interview, offer=offer, accepted=accepted, rejected=rejected, retry=retry)
