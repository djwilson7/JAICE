from typing import List, Dict, Iterable
from contextlib import contextmanager
from dataclasses import dataclass
import os, base64, time, requests, random, redis, uuid
from gmail.gmail_worker import celery_app
from google.oauth2.credentials import Credentials
from common.security import encrypt_token, decrypt_token
from googleapiclient.discovery import build
from shared_worker_library.utils.task_definitions import TaskType, EmailStatus
from common.logger import get_logger
from gmail.gmail_queries import get_refresh_token, insert_staging_records, can_fetch_emails
from datetime import datetime

logging = get_logger()

EMAILS_PER_BATCH = 10
MAX_RETRIES = 5
RETRY_DELAY = 15
POST_BATCH_SLEEP_SEC = 0.5
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID_LOCAL") or os.getenv("GOOGLE_CLIENT_ID_PROD")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET_LOCAL") or os.getenv("GOOGLE_CLIENT_SECRET_PROD")
GOOGLE_TOKEN_URL = os.getenv("GOOGLE_TOKEN_URL", "https://oauth2.googleapis.com/token")


REDIS_URL = os.getenv("CELERY_BROKER_URL_LOCAL") or os.getenv("CELERY_BROKER_URL_PROD")
if not REDIS_URL:
    raise ValueError("CELERY_BROKER_URL environment variable is not set.")

r = redis.Redis.from_url(REDIS_URL, decode_responses=True)


@celery_app.task(
    bind=True,
    name=TaskType.INITIAL_SYNC.task_name,
    queue=TaskType.INITIAL_SYNC.queue_name,
    max_retries=MAX_RETRIES,
    default_retry_delay=RETRY_DELAY,
)
def initial_sync(self, uid: str, trace_id: str, start_date_str: str):
    logging.info(
        f"[{trace_id}] Gmail Initial Sync Dispatcher: Starting initial sync"
    )

    start_date = datetime.fromisoformat(start_date_str)
    logging.info(f"[{trace_id}] Gmail Initial Sync Dispatcher: Using start_date={start_date}")

    try:
        if not can_fetch_emails(uid):
            logging.info(f"[{trace_id}] Gmail Initial Sync Dispatcher: No refresh token available, aborting sync.")
            return
    except Exception as e:
        logging.error(
            f"[{trace_id}] Gmail Initial Sync Dispatcher: Error checking fetch capability: {e}"
        )
        raise self.retry(exc=e, countdown=RETRY_DELAY)
    
    try:
        encrypted_token = get_refresh_token(uid)
        token = decrypt_token(encrypted_token)
    except Exception as e:
        logging.error(
            f"[{trace_id}] Gmail Initial Sync Dispatcher: Error retrieving refresh token: {e}"
        )
        raise self.retry(exc=e)

    try:
        access_token = get_access_token_from_refresh(token, trace_id)

    except Exception as e:
        logging.error(
            f"[{trace_id}] Gmail Initial Sync Dispatcher: Error obtaining access token: {e}"
        )
        raise self.retry(exc=e)

    try:
        days_to_sync = (datetime.utcnow() - start_date).days
        message_ids = fetch_message_ids(access_token, trace_id, days_to_sync)
    except Exception as e:
        logging.error(
            f"[{trace_id}] Gmail Initial Sync Dispatcher: Error fetching message IDs: {e}"
        )
        raise self.retry(exc=e)

    try:
        for batch in chunk_list(message_ids, EMAILS_PER_BATCH):
            logging.info(
                f"[{trace_id}] Gmail Initial Sync Dispatcher: Enqueuing content fetch task for batch of size {len(batch)}"
            )
            fetch_content.delay(
                batch, encrypt_token(uid), trace_id, encrypt_token(access_token)
            )
    except Exception as e:
        logging.error(
            f"[{trace_id}] Gmail Initial Sync Dispatcher: Error enqueuing content fetch tasks: {e}"
        )
        raise self.retry(exc=e)

    logging.info(
        f"[{trace_id}] Gmail Initial Sync Dispatcher: Completed enqueuing tasks."
    )


@dataclass
class BatchResult:
    successful: list
    retry: list
    skipped: list


@celery_app.task(
    bind=True,
    name=TaskType.FETCH_CONTENT.task_name,
    queue=TaskType.FETCH_CONTENT.queue_name,
    max_retries=MAX_RETRIES,
    default_retry_delay=RETRY_DELAY,
)
def fetch_content(
    self,
    message_id_batch: list,
    encrypted_uid: str,
    trace_id: str,
    encrypted_access_token: str,
):
    uid = decrypt_token(encrypted_uid)
    access_token = decrypt_token(encrypted_access_token)
    logging.info(
        f"[{trace_id}] fetch_content: start (batch={len(message_id_batch)})"
    )

    try:
        if not can_fetch_emails(uid):
            logging.info(f"[{trace_id}] fetch_content: No refresh token available, aborting fetch.")
            return
    except Exception as e:
        logging.error(
            f"[{trace_id}] fetch_content: Error checking fetch capability: {e}"
        )
        raise self.retry(exc=e, countdown=RETRY_DELAY)
    # This needs cleaned up into clean try except blocks for each step.
    # This also needs to be separated from the inital intake worker
    try:
        with user_lock(trace_id, uid, max_slots=2, ttl_sec=6):
            results = gmail_fetch_batch(trace_id, message_id_batch, access_token)

            parsed = parse_successful_fetches(trace_id, results.successful, uid)
            log_and_skip(trace_id, results.skipped)

        encrypted_emails = prepare_staging_payload(trace_id, parsed)
        row_ids = write_to_staging(trace_id, encrypted_emails)
        enqueue_model_processing(trace_id, row_ids)
        
        if results.retry:
            schedule_retry(
                self, trace_id, results.retry, encrypted_uid, encrypted_access_token
            )
            return
    except _LockNotAcquired:
        delay = _backoff(self.request.retries)
        logging.info(
            f"[{trace_id}] lock not acquired retrying in: {delay:.2f}s"
        )
        raise self.retry(countdown=delay, exc=_LockNotAcquired())

    except Exception as e:
        delay = _backoff(self.request.retries)
        logging.error(
            f"[{trace_id}] fetch_content: fatal error -> {e}; retry in {delay:.2f}s",
            exc_info=True,
        )
        raise self.retry(countdown=delay, exc=e)


class _LockNotAcquired(Exception):
    pass


@contextmanager
def user_lock(trace_id: str, uid: str, max_slots: int = 2, ttl_sec: int = 6):
    """
    Allow up to `max_slots` concurrent tasks per user using Redis slot keys:
    gmail_lock:{uid}:0 ... gmail_lock:{uid}:{max_slots-1}
    If none available, raise _LockNotAcquired to let caller reschedule.
    """
    slot_key = None
    try:
        for slot in range(max_slots):
            key = f"gmail_lock:{uid}:{slot}"
            if r.set(key, "1", nx=True, ex=ttl_sec):
                slot_key = key
                break
        if not slot_key:
            raise _LockNotAcquired()

        logging.info(f"[{trace_id}] user_lock: acquired {slot_key}")
        yield
    finally:
        if slot_key:
            try:
                r.delete(slot_key)
                logging.info(f"[{trace_id}] user_lock: released {slot_key}")
            except Exception:
                # Non-fatal; TTL will clear it
                pass


def gmail_fetch_batch(
    trace_id: str, ids: Iterable[str], access_token: str
) -> BatchResult:
    """
    Runs a Gmail batch get(format=full) for given message IDs.
    Returns a BatchResult: successful (raw responses), retry (IDs), skipped (IDs).
    """
    credentials = Credentials(token=access_token)
    service = build("gmail", "v1", credentials=credentials, cache_discovery=False)

    successful = []
    retry = []
    skipped = []

    # Wire callback with request_id = msg_id so we can retry precisely
    def callback(request_id, response, exception):
        msg_id = request_id
        if exception is None and response is not None:
            successful.append({"msg_id": msg_id, "response": response})
            return

        # Classify errors
        decision = _classify_error(exception)
        if decision == "SKIP":
            skipped.append(msg_id)
        elif decision == "RETRY":
            retry.append(msg_id)
        else:
            # default: log + skip
            logging.warning(
                f"[{trace_id}] gmail_fetch_batch: non-retryable error for {msg_id}: {exception}"
            )
            skipped.append(msg_id)

    batch = service.new_batch_http_request(callback=callback)
    count = 0
    for msg_id in ids:
        batch.add(
            service.users()
            .messages()
            .get(
                userId="me",
                id=msg_id,
                format="full",
                fields="id,threadId,historyId,internalDate,payload",
            ),
            request_id=msg_id,
        )
        count += 1

    logging.info(f"[{trace_id}] gmail_fetch_batch: executing batch ({count} requests)")
    batch.execute()

    # Per-user throttle to stay under ~250 units/sec/user (10 msgs × 5 units = 50; with 2 slots → ~100)
    time.sleep(POST_BATCH_SLEEP_SEC)

    logging.info(
        f"[{trace_id}] gmail_fetch_batch: results -> success={len(successful)} retry={len(retry)} skip={len(skipped)}"
    )
    return BatchResult(successful=successful, retry=retry, skipped=skipped)


def parse_successful_fetches(
    trace_id: str, success_items: List[Dict], uid: str
) -> List[Dict]:
    """
    Convert raw Gmail 'format=full' responses to normalized email dicts.
    """
    parsed_emails: List[Dict] = []
    for item in success_items:
        resp = item["response"]
        msg_id = item["msg_id"]
        try:
            payload = resp.get("payload", {})
            headers = payload.get("headers", [])
            subject = _get_header(headers, "Subject")
            sender = _get_header(headers, "From")
            recipient = _get_header(headers, "To")

            body_text = extract_plain_text_from_payload(payload)

            parsed_emails.append(
                {
                    "user_id": uid,
                    "trace_id": trace_id,
                    "provider": "google",
                    "provider_message_id": resp.get("id", msg_id),
                    "thread_id": resp.get("threadId"),
                    "history_id": resp.get("historyId"),
                    "received_at": resp.get("internalDate"),
                    "subject": subject,
                    "sender": sender,
                    "recipient": recipient,
                    "body_text": body_text,
                }
            )
        except Exception as ex:
            logging.warning(f"[{trace_id}] parse: msg_id={msg_id} parse error -> {ex}")
    logging.info(f"[{trace_id}] parse: parsed={len(parsed_emails)}")
    return parsed_emails


def _get_header(headers: List[Dict], name: str) -> str:
    for h in headers:
        if h.get("name", "").lower() == name.lower():
            return h.get("value", "")
    return ""


def extract_plain_text_from_payload(payload: Dict, depth: int = 0) -> str:
    """
    Attempts to extract plaintext body.
    Priority:
        1. text/plain
        2. stripped text/html
        3. fallback ""
    """
    if depth > 10:
        return ""
    
    # If payload has a simple body
    if "body" in payload and payload.get("body", {}).get("data"):
        if payload.get("mimeType") == "text/plain":
            return _decode_gmail_body(payload["body"]["data"])

    # Multipart
    parts = payload.get("parts", [])
    plain_text = None
    html_text = None

    for part in parts:
        mime = part.get("mimeType", "")
        body = part.get("body", {}).get("data")

        if mime == "text/plain" and body:
            plain_text = _decode_gmail_body(body)

        elif mime == "text/html" and body:
            html_text = strip_html(_decode_gmail_body(body))

        # Recursively walk nested parts
        if "parts" in part:
            nested = extract_plain_text_from_payload(part, depth + 1)
            if nested and not plain_text:
                plain_text = nested

    if plain_text:
        return plain_text
    if html_text:
        return html_text
    return ""


def _decode_gmail_body(b64data: str) -> str:
    return base64.urlsafe_b64decode(b64data).decode("utf-8", errors="ignore")


def strip_html(html: str) -> str:
    import re

    return re.sub(r"<[^>]+>", "", html).strip()


def log_and_skip(trace_id: str, skipped_ids: List[str]) -> None:
    if not skipped_ids:
        return
    logging.info(
        f"[{trace_id}] skipped {len(skipped_ids)} message(s): {skipped_ids[:5]}{'…' if len(skipped_ids) > 5 else ''}"
    )


def schedule_retry(
    self,
    trace_id: str,
    retry_ids: List[str],
    encrypted_uid: str,
    encrypted_access_token: str,
) -> None:
    delay = _backoff(self.request.retries)
    logging.warning(f"[{trace_id}] retry: {len(retry_ids)} message(s) in {delay:.2f}s")
    fetch_content.apply_async(
        args=[retry_ids, encrypted_uid, trace_id, encrypted_access_token],
        countdown=delay,
    )


def prepare_staging_payload(trace_id: str, parsed_emails: List[Dict]) -> List[Dict]:
    """
    Encrypt sensitive fields and shape records for staging.
    Output maps directly to email_staging INSERT columns.
    """
    encrypted: List[Dict] = []
    for e in parsed_emails:
        row_id = str(uuid.uuid4())
        encrypted.append(
            {
                "id": row_id,
                "user_id_enc": encrypt_token(e["user_id"]),
                "trace_id": e["trace_id"],
                "provider": e["provider"],
                "provider_message_id": e["provider_message_id"],
                "subject_enc": encrypt_token(e["subject"]),
                "sender_enc": encrypt_token(e["sender"]),
                "received_at": e["received_at"],
                "body_enc": encrypt_token(e["body_text"]),
                "status": EmailStatus.AWAIT_RELEVANCE.value,
            }
        )
    logging.info(f"[{trace_id}] prepare_staging_payload: encrypted={len(encrypted)}")
    return encrypted


def write_to_staging(trace_id: str, encrypted_emails: List[Dict]) -> List[str]:
    """
    Writes the batch to the staging table and returns the list of inserted row IDs.
    """
    try:
        row_ids = insert_staging_records(
            trace_id, encrypted_emails
        )  # <-- DB helper (batch insert)
        logging.info(f"[{trace_id}] staging: INSERT OK ({len(row_ids)} rows)")
        return row_ids

    except Exception as e:
        logging.error(
            f"[{trace_id}] staging: INSERT FAILED for {len(encrypted_emails)} rows -> {e}",
            exc_info=True,
        )
        raise


def enqueue_model_processing(trace_id: str, row_ids: List[str]) -> None:
    logging.info(
        f"[{trace_id}] model: enqueuing batch of {len(row_ids)} rows for relevance stage"
    )
    celery_app.send_task(
        TaskType.RELEVANCE_MODEL.task_name,
        args=[trace_id, row_ids],
        queue=TaskType.RELEVANCE_MODEL.queue_name,
    )

def _classify_error(exception: Exception) -> str:
    """
    Map Gmail API errors to SKIP / RETRY.
    - 404/410/notFound: SKIP (message disappeared)
    - 429/rateLimitExceeded or 5xx: RETRY
    - else: SKIP (non-transient)
    """
    if not exception:
        return "SKIP"
    s = str(exception)
    s_lower = s.lower()
    if "404" in s or "410" in s or "notfound" in s_lower:
        return "SKIP"
    if (
        "ratelimitexceeded" in s_lower
        or "429" in s
        or "500" in s
        or "502" in s
        or "503" in s
        or "504" in s
    ):
        return "RETRY"
    return "SKIP"


def _backoff(retry_count: int) -> float:
    """
    Exponential backoff with jitter; clamp to reasonable upper bound.
    """
    base = min(max(1, 2 ** max(retry_count, 1)), 64)  # 2,4,8,...,64
    jitter = random.uniform(0.1, 0.7)
    return base + jitter


def fetch_message_ids(access_token:str, trace_id: str, days_back:int=7):
    logging.info(
        f"[{trace_id}] ----- Fetching message IDs from Gmail API for the past {days_back} days."
    )
    timestamp = int(time.time()) - (days_back * 24 * 60 * 60)
    query = f"after:{timestamp}"
    url = "https://gmail.googleapis.com/gmail/v1/users/me/messages"
    all_ids = []
    page_token = None
    headers = {"Authorization": f"Bearer {access_token}"}

    while True:
        params = {
            "q": query,
            "maxResults": 500,
        }
        if page_token:
            params["pageToken"] = page_token

        try:
            logging.info(
                f"[{trace_id}] ----- Fetching message IDs page with token: {page_token}"
            )
            response = requests.get(url, headers=headers, params=params, timeout=30)
            logging.info(
                f"[{trace_id}] ----- Gmail API Response Status: {response.status_code}"
            )
            response.raise_for_status()
            data = response.json()
        except Exception as e:
            logging.error(f"[{trace_id}] ----- Error fetching message IDs: {e}")
            raise
        messages = data.get("messages", [])
        ids = [msg["id"] for msg in messages] if messages else []
        all_ids.extend(ids)

        page_token = data.get("nextPageToken")
        if not page_token:
            break
    return all_ids


def chunk_list(lst, size):
    logging.info(f"Chunking list of size {len(lst)} into batches of {size}.")
    for i in range(0, len(lst), size):
        yield lst[i : i + size]


def get_access_token_from_refresh(refresh_token: str, trace_id: str) -> str:
    logging.info(f"[{trace_id}] ----- Exchanging refresh token for Gmail access token.")
    payload = {
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
    }
    response = requests.post(GOOGLE_TOKEN_URL, data=payload, timeout=30)
    logging.info(
        f"[{trace_id}] ----- Google Token Endpoint Response Status: {response.status_code}"
    )
    if response.status_code != 200:
        logging.error(
            f"[{trace_id}] ----- Failed to exchange refresh token. "
            f"Status={response.status_code}, Response={response.text}"
        )
        raise Exception("Failed to exchange refresh token for access token.")

    access_token = response.json().get("access_token")
    if not access_token:
        logging.error(
            f"[{trace_id}] ----- No access token returned from Google token endpoint."
        )
        raise Exception("No access token in token exchange response.")

    logging.info(f"[{trace_id}] ----- Successfully retrieved Gmail access token.")
    return access_token

