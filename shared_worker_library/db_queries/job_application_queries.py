from datetime import datetime, timezone
from typing import List

from common.logger import get_logger
from common.security import decrypt_token
from shared_worker_library.db_queries.std_queries import get_data_from_staging
from shared_worker_library.db_queries.transfer_query import execute_transfer_query
from shared_worker_library.database import get_connection
from shared_worker_library.utils.to_bytes import to_bytes

logging = get_logger()


def insert_processing_placeholders_from_staging(
    trace_id: str,
    row_ids: List[str],
) -> dict:
    """
    Create visible Processing cards for newly staged Gmail rows.

    The rows are inserted as app_stage='staging' and later updated by the rule
    or inference pipeline. Duplicate provider messages and existing thread rows
    are intentionally ignored by the SQL guards.
    """
    if not row_ids:
        logging.info(f"[{trace_id}] No staging rows provided for processing placeholders")
        return {"status": "no_data", "rows_affected": 0}

    staging_rows = get_data_from_staging(trace_id, row_ids)
    if not staging_rows:
        logging.info(f"[{trace_id}] No staging rows found for processing placeholders")
        return {"status": "no_data", "rows_affected": 0}

    values = []

    for row in staging_rows:
        (
            staging_id,
            user_id_enc,
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

        try:
            user_uid = decrypt_token(to_bytes(user_id_enc))
            subject = decrypt_token(to_bytes(subject_enc)) if subject_enc else ""
            body = decrypt_token(to_bytes(body_enc)) if body_enc else ""
        except Exception as exc:
            logging.error(
                f"[{trace_id}] Failed to decrypt staging row {staging_id} "
                f"for processing placeholder: {exc}"
            )
            continue

        provider_source = provider or "gmail"
        values.append(
            (
                user_uid,
                subject,
                None,
                body,
                "staging",
                provider_source,
                None,
                None,
                None,
                False,
                False,
                received_at,
                datetime.now(timezone.utc),
                None,
                None,
                None,
                provider_message_id,
                provider_thread_id,
                provider_history_id,
                provider_thread_id,
                user_uid,
                provider_source,
                provider_thread_id,
            )
        )

    if not values:
        return {"status": "no_data", "rows_affected": 0}

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
        provider_thread_id,
        provider_history_id
    )
    SELECT
        %s, %s, %s, %s,
        %s, %s, %s, %s,
        %s, %s, %s,
        %s, %s, %s, %s, %s, %s,
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

    return execute_transfer_query(
        trace_id=trace_id,
        query=query,
        values=values,
        commit=True,
    )


def delete_staging_job_applications(
    trace_id: str,
    provider_message_ids: List[str],
) -> dict:
    if not provider_message_ids:
        return {"status": "no_updates", "rows_affected": 0}

    values = [(provider_message_id,) for provider_message_id in provider_message_ids]
    query = """
    DELETE FROM public.job_applications
    WHERE provider_message_id = %s
      AND app_stage = 'staging';
    """
    return execute_transfer_query(
        trace_id=trace_id,
        query=query,
        values=values,
        commit=True,
    )


def mark_staging_job_applications_for_review(
    trace_id: str,
    provider_message_ids: List[str],
) -> dict:
    if not provider_message_ids:
        return {"status": "no_updates", "rows_affected": 0}

    values = [(provider_message_id,) for provider_message_id in provider_message_ids]
    query = """
    UPDATE public.job_applications
    SET needs_review = TRUE
    WHERE provider_message_id = %s
      AND app_stage = 'staging';
    """
    return execute_transfer_query(
        trace_id=trace_id,
        query=query,
        values=values,
        commit=True,
    )


def get_stale_processing_staging_row_ids(
    trace_id: str,
    older_than_minutes: int,
    limit: int,
) -> List[str]:
    """
    Find Processing cards that still have staged email payloads available.

    These rows are visible as app_stage='staging'. If a worker retry was lost or
    the inference task exited before scheduling a retry/review update, the row
    can sit there indefinitely. Returning staging IDs lets the inference worker
    reprocess the original encrypted email payload.
    """
    older_than_minutes = max(1, int(older_than_minutes))
    limit = max(1, int(limit))

    query = """
    SELECT s.id
    FROM public.job_applications j
    JOIN internal_staging.email_staging s
      ON s.provider_message_id = j.provider_message_id
    WHERE j.app_stage = 'staging'
      AND COALESCE(j.needs_review, FALSE) = FALSE
      AND j.updated_at < now() - (%s * interval '1 minute')
    ORDER BY j.updated_at ASC
    LIMIT %s;
    """

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, (older_than_minutes, limit), prepare=False)
                rows = cur.fetchall()
                row_ids = [row[0] for row in rows]
                logging.info(
                    f"[{trace_id}] Found {len(row_ids)} stale processing rows "
                    f"older_than_minutes={older_than_minutes}"
                )
                return row_ids
    except Exception as e:
        logging.error(f"[{trace_id}] Error fetching stale processing rows: {e}")
        return []
