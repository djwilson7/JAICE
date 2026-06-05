from shared_worker_library.database import get_connection
from common.logger import get_logger
from typing import List, Dict, Union

logging = get_logger()


def get_refresh_token(uid: str) -> Union[str, None]:
    """Fetches the refresh token for a given user ID."""
    logging.info("Fetching refresh token")
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT google_refresh_token FROM user_account WHERE user_id = %s",
                (uid,),
                prepare=False,
            )
            row = cur.fetchone()
            logging.info(f"Retrieved refresh token. Found: {row is not None}")
            return row[0] if row else None


def can_fetch_emails(uid: str) -> bool:
    """Checks if emails can be fetched for a given user ID."""
    logging.info("Checking if emails can be fetched")
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT google_refresh_token FROM user_account WHERE user_id = %s",
                (uid,),
                prepare=False,
            )
            row = cur.fetchone()
            can_fetch = row[0] if row else False
            text = "Yes" if can_fetch else "No"
            logging.info(f"Refresh token exists for user: {text}")
            return can_fetch


def get_user_by_email(email_address: str) -> Union[str, None]:
    """Finds a local user row by the Gmail account address in a Pub/Sub event."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT user_id
                FROM public.user_account
                WHERE lower(user_email) = lower(%s)
                LIMIT 1
                """,
                (email_address,),
                prepare=False,
            )
            row = cur.fetchone()
            return row[0] if row else None


def get_gmail_sync_state(uid: str) -> Union[Dict, None]:
    """Returns the local Gmail cursor/watch state for a user."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    user_id,
                    user_email,
                    google_refresh_token,
                    gmail_connected,
                    gmail_history_id,
                    gmail_watch_expiration,
                    last_pubsub_message_id
                FROM public.user_account
                WHERE user_id = %s
                """,
                (uid,),
                prepare=False,
            )
            row = cur.fetchone()
            if not row:
                return None
            return {
                "user_id": row[0],
                "user_email": row[1],
                "google_refresh_token": row[2],
                "gmail_connected": row[3],
                "gmail_history_id": row[4],
                "gmail_watch_expiration": row[5],
                "last_pubsub_message_id": row[6],
            }


def update_gmail_watch_state(uid: str, history_id: str, expiration) -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE public.user_account
                SET gmail_history_id = %s,
                    gmail_watch_expiration = to_timestamp(%s / 1000.0),
                    gmail_sync_status = 'watching',
                    gmail_last_sync_error = NULL,
                    updated_at = now()
                WHERE user_id = %s
                """,
                (history_id, int(expiration), uid),
                prepare=False,
            )
        conn.commit()


def update_gmail_history_id(uid: str, history_id: str) -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE public.user_account
                SET gmail_history_id = %s,
                    gmail_sync_status = 'synced',
                    gmail_last_sync_at = now(),
                    gmail_last_sync_error = NULL,
                    updated_at = now()
                WHERE user_id = %s
                """,
                (history_id, uid),
                prepare=False,
            )
        conn.commit()


def update_pubsub_marker(uid: str, pubsub_message_id: str) -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE public.user_account
                SET last_pubsub_message_id = %s,
                    gmail_sync_status = 'event_received',
                    updated_at = now()
                WHERE user_id = %s
                """,
                (pubsub_message_id, uid),
                prepare=False,
            )
        conn.commit()


def mark_gmail_sync_error(uid: str, error: str) -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE public.user_account
                SET gmail_sync_status = 'error',
                    gmail_last_sync_error = %s,
                    updated_at = now()
                WHERE user_id = %s
                """,
                (error[:1000], uid),
                prepare=False,
            )
        conn.commit()


def clear_gmail_sync_state(uid: str) -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE public.user_account
                SET gmail_history_id = NULL,
                    gmail_watch_expiration = NULL,
                    last_pubsub_message_id = NULL,
                    gmail_sync_status = NULL,
                    gmail_last_sync_at = NULL,
                    gmail_last_sync_error = NULL,
                    updated_at = now()
                WHERE user_id = %s
                """,
                (uid,),
                prepare=False,
            )
        conn.commit()


def insert_staging_records(trace_id: str, encrypted_emails: List[Dict]) -> List[str]:
    """
    Writes a batch of emails into internal_staging.email_staging
    and returns the inserted row IDs.
    """
    logging.info(
        f"[{trace_id}] staging: beginning insertion of {len(encrypted_emails)} emails"
    )
    insert_sql = """
        INSERT INTO internal_staging.email_staging (
            id, user_id_enc, trace_id, provider, provider_message_id,
            subject_enc, sender_enc, received_at, body_enc,
            provider_thread_id, provider_history_id
        )
        VALUES (
            %(id)s, %(user_id_enc)s, %(trace_id)s, %(provider)s, %(provider_message_id)s,
            %(subject_enc)s, %(sender_enc)s, %(received_at)s, %(body_enc)s,
            %(provider_thread_id)s, %(provider_history_id)s
        )
        ON CONFLICT (provider, provider_message_id) DO NOTHING
        RETURNING id;
    """
    inserted_ids = []
    for record in encrypted_emails:
        try:
            with get_connection() as conn:
                conn.autocommit = True
                with conn.cursor() as cur:
                    cur.execute(insert_sql, record, prepare=False)
                    row = cur.fetchone()
                    if row is None:
                        logging.info(
                            f"[{trace_id}] staging: duplicate provider message skipped "
                            f"provider={record.get('provider')} "
                            f"provider_message_id={record.get('provider_message_id')}"
                        )
                        continue
                    inserted_ids.append(row[0])
        except Exception as e:
            logging.error(f"[{trace_id}] staging: error inserting emails -> {e}")
            inserted_ids = []

    logging.info(
        f"[{trace_id}] staging: inserted {len(inserted_ids)} rows into email_staging"
    )
    return inserted_ids
