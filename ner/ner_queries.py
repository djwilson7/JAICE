# from shared_worker_library.database import get_connection
from common.logger import get_logger
# from shared_worker_library.utils.task_definitions import EmailStatus, EmailStage

logging = get_logger()

def update_job_app_table(trace_id: str, model_results: list[dict[str, int]]):
    logging.info(f"[{trace_id}] Updating job application table with NER Model Results.")
    '''
    with get_connection() as conn:
        with conn.cursor() as cur:
            In this section, we need to iterate over the model results object, and create update statements
            based on the NER model's output structure.
            
            If we decide to store sep entities inside the table that would look something like:
            
            updating for person objects
            updating for loc objects
            updating for org objects
            updating for pii objects
            or we may update different tables based on how we want to structure the data.
            
            We may also branch this into multiple functions, 1 to update the status and stage, 1 to update the extracted entities. and have this method call both.
        conn.commit()
    '''
    logging.info(f"[{trace_id}] Job application table updated with NER results.")
    return {"status": "updated"}