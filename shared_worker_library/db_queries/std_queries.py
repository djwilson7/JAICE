from shared_worker_library.database import get_connection
from common.logger import get_logger
from psycopg.rows import dict_row
from shared_worker_library.utils.task_definitions import EmailStatus

logging = get_logger()

def get_encrypted_emails(trace_id: str, row_ids: list[int]):
    logging.info(f"[{trace_id}] Getting encrypted emails")
    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                "SELECT id, subject_enc, body_enc, sender_enc, provider_message_id FROM internal_staging.email_staging WHERE id = ANY(%s)",
                (row_ids,),
                prepare=False
            )
            results = cur.fetchall()
            logging.info(f"[{trace_id}] Retrieved {len(results)} encrypted emails")
            return results


def update_staging_table_failure(trace_id: str, row_ids: list[int]):
    logging.info(f"[{trace_id}] Updating staging table to FAILED_PERMANENTLY")
    
    with get_connection() as conn:
        with conn.cursor() as cur:
            for row_id in row_ids:
                cur.execute(
                    "UPDATE internal_staging.email_staging SET status = %s WHERE id = %s",
                    (EmailStatus.FAILED_PERMANENTLY.value, row_id),
                    prepare=False,
                )
        conn.commit()
    logging.info(f"[{trace_id}] Staging table updated to FAILED_PERMANENTLY")
    return {"status": "updated_to_failed_permanently"}

def get_data_from_staging(trace_id: str, row_ids: list[str]) -> list[tuple]:
    logging.info(f"[{trace_id}] Fetching {len(row_ids)} rows from staging table")

    if not row_ids:
        logging.warning(f"[{trace_id}] No row IDs provided for get_data_from_staging()")
        return []

    query = """
    SELECT 
        id,
        user_id_enc,
        trace_id,
        provider,
        provider_message_id,
        subject_enc,
        sender_enc,
        received_at,
        body_enc
    FROM internal_staging.email_staging
    WHERE id = ANY(%s);
    """

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, (row_ids,), prepare=False)
                data = cur.fetchall()
                logging.info(f"[{trace_id}] Retrieved {len(data)} rows from staging")
                return data
    except Exception as e:
        logging.error(f"[{trace_id}] Error fetching staging data: {e}")
        return []
