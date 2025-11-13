from ner.ner_worker import celery_app
from common.logger import get_logger
from shared_worker_library.utils.task_definitions import TaskType, EmailStatus
from shared_worker_library.db_queries.std_queries import get_encrypted_emails, update_staging_table_failure
from ner.ner_queries import update_job_app_table
from typing import List, Dict
from common.security import decrypt_token
from shared_worker_library.utils.to_bytes import to_bytes
import random

logging = get_logger()
MAX_RETRIES = 3

@celery_app.task(
    queue=TaskType.NER_MODEL.queue_name, name=TaskType.NER_MODEL.task_name
)
def ner_task(trace_id: str, row_ids: list):
    logging.info(f"[{trace_id}] Starting NER extraction task.")
    
    
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
        model_results = run_ner_model(trace_id, normalized_emails)
    except Exception as e:
        logging.error(f"[{trace_id}] Error running NER model: {e}")
        return {"status": "failure", "error": str(e)}

    try:
        results = update_job_app_table(trace_id, model_results)
    except Exception as e:
        logging.error(f"[{trace_id}] Error updating staging table: {e}")
        return {"status": "failure", "error": str(e)}

    # We no longer enqueue for the next model
    # Classification and NER run in parrallel and can insert into the job applications table independently.
    
    logging.info(f"[{trace_id}] NER task completed successfully")
    return {"status": "success", "results": results}

def decrypt_email_content(trace_id: str, encrypted_emails: List[Dict]) -> List[Dict]:
    logging.info(f"[{trace_id}] Decrypting email content")
    # This will need to be optimized to only create the necessary decrypted fields for the NER model.
    decrypted_emails = []
    for email in encrypted_emails:
        try:
            decrypted_emails.append(
                {
                    "id": email["id"],
                    "subject": decrypt_token(to_bytes(email["subject_enc"])),
                    "sender": decrypt_token(to_bytes(email["sender_enc"])),
                    "body": decrypt_token(to_bytes(email["body_enc"])),
                }
            )
        except Exception as e:
            logging.error(f"[{trace_id}] Error decrypting email ID {email['id']}: {e}")
    return decrypted_emails

def normalized_emails_for_model(trace_id: str, emails: list[dict]) -> list[dict]:
    logging.warning(
        f"Normalizing emails for trace_id {trace_id}. Functionality not yet implemented."
    )
    # All content for the row is pulled into the emails list. This will later be optimized to only pull necessary fields for the relevance model.
    # {
    #     "id",                     -> Generated for the staging table
    #     "subject",                -> email subject
    #     "sender",                 -> email sender
    #     "body",                   -> email body content
    # }
    # For now, we just return the emails as-is.
    return emails

def run_ner_model(trace_id: str, emails: list[dict]) -> list[dict[str, int]]:
    logging.warning(f"[{trace_id}] Running NER model. Functionality not yet implemented.")
    # This is where the NER model logic will sit. It will always receive normalized emails that have been decrypted.
    # It should return a NERModelResult object with relevant, retry, and purge lists.
    #
    # ITS IMPORTANT THAT WE ONLY RETURN THE ROW IDS IN THE RESULT OBJECT TO MINIMIZE DATA TRANSFER.
    #
    # TODO: Implement the NER model logic here
    #
    # The return value should sort the email id's emails["id"] into applied, interview, offer, accepted, rejected, and retry lists.
    # For now, we simulate model behavior with placeholder logic.
    
    # NER can return extracted entities, and we can categorize emails based on presence of certain entities.
    # This needs reformatted for NERModelResult once defined.
    '''
    This method will take in a list of emails (which contain id, subject, sender, body) and process them through the NER model.
    I'm not sure what output we would expect or want from ner currently, so i'll leave this as placeholder logic.
    However, we would ideally return a NERModelResult object with data we can write to the staging table for the next layer.
    
    For now i'm just returning the email ids as-is.
    '''
    return [email["provider_message_id"] for email in emails]