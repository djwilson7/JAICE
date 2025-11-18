from shared_worker_library.db_queries.transfer_query import execute_transfer_query
from common.logger import get_logger
from shared_worker_library.utils.task_definitions import (EmailStage, ClassificationModelResult)

logging = get_logger()


def to_percent(value):
    """ convert a float value (0.0 to 1.0) to an integer percent (0 to 100) """
    try:
        if value is None:
            return None
        
        v = float(value)

        if 0.0 <= v <= 1.0:
            return int(v * 100)
        return int(v)
    
    except Exception:
        return None

def update_job_app_table(trace_id: str, model_results: ClassificationModelResult):
    """
    Updates job_applications table with predicted classification stages.
    Each stage dict maps provider_message_id -> confidence score.
    """
    logging.info(f"[{trace_id}] Updating job_applications table with classification results.")

    # Build the list of tuples for batch update
    values = []
    for stage, stage_dict in [
        (EmailStage.APPLIED, model_results.applied),
        (EmailStage.INTERVIEW, model_results.interview),
        (EmailStage.OFFER, model_results.offer),
        (EmailStage.ACCEPTED, model_results.accepted),
        (EmailStage.REJECTED, model_results.rejected),
    ]:
        # stage_dict is now a mapping of {provider_message_id: confidence}
        for email in stage_dict:
            values.append((
                stage.value,
                email.get("top_score"),
                email.get("second_score"),
                email.get("second_label"),
                email.get("needs_review"), 
                email.get("provider_message_id"),  # provider_message_id
            ))

    if not values:
        logging.info(f"[{trace_id}] No classification results to process.")
        return {"status": "no_updates"}

    query = """
    UPDATE public.job_applications
    SET app_stage = %s,
        stage_confidence = %s,
        stage_confidence_secondary = %s,
        app_stage_secondary = %s,
        needs_review = %s
    WHERE provider_message_id = %s;
    """

    result = execute_transfer_query(
        trace_id=trace_id,
        query=query,
        values=values,
        commit=True,
    )

    if result["status"] == "failure":
        logging.error(f"[{trace_id}] Classification update failed: {result['error']}")
    else:
        logging.info(f"[{trace_id}] Updated {result['rows_affected']} job_applications rows successfully.")

    return result