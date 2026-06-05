import re
from shared_worker_library.db_queries.transfer_query import execute_transfer_query
from shared_worker_library.db_queries.std_queries import get_data_from_staging
from common.security import decrypt_token
from shared_worker_library.utils.to_bytes import to_bytes
from common.logger import get_logger
from shared_worker_library.utils.task_definitions import RelevanceModelResult
from datetime import datetime, timezone

logging = get_logger()


def update_job_app_table(trace_id: str, model_results: RelevanceModelResult):
    """
    Inserts placeholder job records for relevant emails directly into `job_applications` table.

    - Attaches known fields: subject, body (decrypted), provider info, and relevance score.
    - Sets other fields to NULL for downstream workers (classification/extraction).
    - Uses `ON CONFLICT DO NOTHING` on `provider_message_id` to prevent duplicates.

    Args:
        trace_id: Trace ID for logging.
        model_results: RelevanceModelResult containing IDs of relevant emails.

    Returns:
        DB operation result dictionary.
    """
    logging.info(f"[{trace_id}] Inserting job application records")

    if not model_results.relevant:
        logging.info(f"[{trace_id}] No relevant emails found to insert.")
        return {"status": "no_relevant_emails"}

    try:
        staging_rows = get_data_from_staging(trace_id, list(model_results.relevant.keys()))
        if not staging_rows:
            logging.warning(f"[{trace_id}] No staging data found for relevant IDs.")
            return {"status": "no_data"}

        try:
            first_user_id_enc = staging_rows[0][1]  # user_id_enc is second col
            user_uid = decrypt_token(to_bytes(first_user_id_enc))
        except Exception as e:
            logging.error(f"[{trace_id}] Failed to decrypt shared user UID: {e}")
            return {"status": "failure", "error": str(e)}

        values = []
        for row in staging_rows:
            provider_thread_id = None
            provider_history_id = None
            if len(row) >= 11:
                (
                    staging_id,
                    _user_id_enc,
                    _trace_id,
                    provider,
                    provider_message_id,
                    subject_enc,
                    _sender_enc,
                    received_at,
                    body_enc,
                    provider_thread_id,
                    provider_history_id,
                ) = row
            else:
                (
                    staging_id,
                    _user_id_enc,
                    _trace_id,
                    provider,
                    provider_message_id,
                    subject_enc,
                    _sender_enc,
                    received_at,
                    body_enc,
                ) = row

            # Map only minimal known fields
            provider_source = provider or "gmail"
            relevance_conf = float(model_results.relevant.get(str(staging_id), 0.0))
            subject = decrypt_token(to_bytes(subject_enc)) if subject_enc else ""
            body = decrypt_token(to_bytes(body_enc)) if body_enc else ""
            # Build tuple aligned with job_applications schema
            values.append(
                (
                    user_uid,            # user_uid
                    subject,             # title
                    None,                # company_name
                    body,                # description
                    "staging",           # app_stage
                    provider_source,     # provider_source
                    None,                # recruiter_name
                    None,                # recruiter_email
                    None,                # stage_confidence
                    False,               # is_archived
                    False,               # is_deleted
                    received_at,         # received_at
                    datetime.now(timezone.utc),  # updated_at
                    None,                # app_stage_secondary
                    None,                # stage_confidence_secondary
                    None,                # needs_review
                    provider_message_id, # provider_message_id
                    relevance_conf,      # relevance_model_confidence
                    provider_thread_id,  # provider_thread_id
                    provider_history_id, # provider_history_id
                    provider_thread_id,  # nullable thread gate
                    user_uid,            # existing thread lookup
                    provider_source,     # existing thread lookup
                    provider_thread_id,  # existing thread lookup
                )
            )

        # SQL aligned with schema
        query = """
        INSERT INTO public.job_applications (
            user_uid,
            title,
            company_name,
            description,
            app_stage,
            provider_source,
            recruiter_name,
            recruiter_email,
            stage_confidence,
            is_archived,
            is_deleted,
            received_at,
            updated_at,
            app_stage_secondary,
            stage_confidence_secondary,
            needs_review,
            provider_message_id,
            relevance_model_confidence,
            provider_thread_id,
            provider_history_id
        )
        SELECT
            %s, %s, %s, %s,
            %s, %s, %s, %s,
            %s, %s, %s,
            %s, %s, %s, %s, %s, %s, %s,
            %s, %s
        WHERE (
            %s::text IS NULL
            OR NOT EXISTS (
                SELECT 1
                FROM public.job_applications existing
                WHERE existing.user_uid = %s
                  AND existing.provider_source = %s
                  AND existing.provider_thread_id = %s::text
            )
        )
        ON CONFLICT (provider_message_id) DO NOTHING;
        """

        #  Execute batch insert via shared helper
        result = execute_transfer_query(
            trace_id=trace_id,
            query=query,
            values=values,
            commit=True,
        )

        if result["status"] == "failure":
            logging.error(f"[{trace_id}] Insert failed: {result['error']}")
        else:
            logging.info(f"[{trace_id}] Inserted {result['rows_affected']} job records")

        return result

    except Exception as e:
        logging.error(f"[{trace_id}] Error inserting job_applications rows: {e}")
        return {"status": "failure", "error": str(e)}
