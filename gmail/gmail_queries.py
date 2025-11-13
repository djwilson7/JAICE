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
            subject_enc, sender_enc, received_at, body_enc, status
        )
        VALUES (
            %(id)s, %(user_id_enc)s, %(trace_id)s, %(provider)s, %(provider_message_id)s,
            %(subject_enc)s, %(sender_enc)s, %(received_at)s, %(body_enc)s, %(status)s
        )
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
                        logging.error(
                            f"[{trace_id}] staging: no row returned for record: {record}"
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
