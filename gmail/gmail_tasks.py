from typing import List, Dict, Iterable, Optional, Tuple
from contextlib import contextmanager
from dataclasses import dataclass
import os, base64, time, requests, random, redis, uuid
from gmail.gmail_worker import celery_app
from google.oauth2.credentials import Credentials
from common.security import encrypt_token, decrypt_token
from common.email_text import EmailBodyCleanupResult, clean_email_body
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from shared_worker_library.utils.task_definitions import TaskType, EmailStatus
from shared_worker_library.db_queries.job_application_queries import (
    insert_processing_placeholders_from_staging,
)
from common.logger import get_logger
from gmail.gmail_queries import (
    can_fetch_emails,
    clear_gmail_sync_state,
    get_gmail_sync_state,
    get_refresh_token,
    get_user_by_email,
    insert_staging_records,
    mark_gmail_sync_error,
    update_gmail_history_id,
    update_gmail_watch_state,
    update_pubsub_marker,
)
from datetime import datetime, timezone

logging = get_logger()

EMAILS_PER_BATCH = 10
MAX_RETRIES = 5
RETRY_DELAY = 15
POST_BATCH_SLEEP_SEC = 0.5
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID_LOCAL") or os.getenv("GOOGLE_CLIENT_ID_PROD")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET_LOCAL") or os.getenv("GOOGLE_CLIENT_SECRET_PROD")
GOOGLE_TOKEN_URL = os.getenv("GOOGLE_TOKEN_URL", "https://oauth2.googleapis.com/token")
GMAIL_PUBSUB_PROJECT_ID = os.getenv("GMAIL_PUBSUB_PROJECT_ID")
GMAIL_PUBSUB_TOPIC = (
    os.getenv("GMAIL_PUBSUB_TOPIC")
    or os.getenv("GMAIL_PUBSUB_TOPIC_NAME")
)
WATCH_RENEWAL_SKEW_SECONDS = int(os.getenv("GMAIL_WATCH_RENEWAL_SKEW_SECONDS", "86400"))


REDIS_URL = os.getenv("CELERY_BROKER_URL_LOCAL") or os.getenv("CELERY_BROKER_URL_PROD")
if not REDIS_URL:
    raise ValueError("CELERY_BROKER_URL environment variable is not set.")

r = redis.Redis.from_url(REDIS_URL, decode_responses=True)


def _topic_name() -> str:
    if not GMAIL_PUBSUB_TOPIC:
        raise ValueError("GMAIL_PUBSUB_TOPIC_NAME environment variable is not set.")
    if GMAIL_PUBSUB_TOPIC.startswith("projects/"):
        return GMAIL_PUBSUB_TOPIC
    if not GMAIL_PUBSUB_PROJECT_ID:
        raise ValueError("GMAIL_PUBSUB_PROJECT_ID environment variable is not set.")
    return f"projects/{GMAIL_PUBSUB_PROJECT_ID}/topics/{GMAIL_PUBSUB_TOPIC}"


@celery_app.task(
    bind=True,
    name=TaskType.ENSURE_WATCH.task_name,
    queue=TaskType.ENSURE_WATCH.queue_name,
    max_retries=MAX_RETRIES,
    default_retry_delay=RETRY_DELAY,
)
def ensure_watch(self, uid: str, trace_id: str, force: bool = False):
    try:
        return ensure_gmail_watch(uid, trace_id, force=force)
    except Exception as e:
        logging.error(f"[{trace_id}] ensure_watch: failed for user {uid}: {e}")
        try:
            mark_gmail_sync_error(uid, str(e))
        except Exception:
            pass
        raise self.retry(exc=e, countdown=RETRY_DELAY)


@celery_app.task(
    bind=True,
    name=TaskType.CATCH_UP_SYNC.task_name,
    queue=TaskType.CATCH_UP_SYNC.queue_name,
    max_retries=MAX_RETRIES,
    default_retry_delay=RETRY_DELAY,
)
def catch_up_sync(self, uid: str, trace_id: str):
    try:
        result = sync_history_for_user(uid, trace_id)
        watch_state = ensure_gmail_watch(uid, trace_id, force=False)
        result["watch"] = watch_state
        return result
    except Exception as e:
        logging.error(f"[{trace_id}] catch_up_sync: failed for user {uid}: {e}")
        try:
            mark_gmail_sync_error(uid, str(e))
        except Exception:
            pass
        raise self.retry(exc=e, countdown=RETRY_DELAY)


@celery_app.task(
    bind=True,
    name=TaskType.PROCESS_HISTORY_EVENT.task_name,
    queue=TaskType.PROCESS_HISTORY_EVENT.queue_name,
    max_retries=MAX_RETRIES,
    default_retry_delay=RETRY_DELAY,
)
def process_history_event(
    self,
    pubsub_message_id: str,
    email_address: str,
    event_history_id: str,
    trace_id: Optional[str] = None,
):
    trace_id = trace_id or str(uuid.uuid4())
    try:
        uid = get_user_by_email(email_address)
        if not uid:
            logging.warning(
                f"[{trace_id}] process_history_event: no local user for {email_address}"
            )
            return {"status": "ignored", "reason": "unknown_user"}

        update_pubsub_marker(uid, pubsub_message_id)
        result = sync_history_for_user(uid, trace_id, target_history_id=event_history_id)
        result["watch"] = ensure_gmail_watch(uid, trace_id, force=False)
        return result
    except Exception as e:
        logging.error(
            f"[{trace_id}] process_history_event: failed for {email_address}: {e}"
        )
        raise self.retry(exc=e, countdown=RETRY_DELAY)


def ensure_gmail_watch(uid: str, trace_id: str, force: bool = False) -> Dict:
    state = get_gmail_sync_state(uid)
    if not state or not state.get("google_refresh_token"):
        logging.info(f"[{trace_id}] ensure_gmail_watch: no Gmail token for user {uid}")
        return {"status": "skipped", "reason": "not_connected"}

    expiration = state.get("gmail_watch_expiration")
    if not force and expiration:
        now = datetime.now(timezone.utc)
        exp = expiration
        if getattr(exp, "tzinfo", None) is None:
            exp = exp.replace(tzinfo=timezone.utc)
        seconds_remaining = (exp - now).total_seconds()
        if seconds_remaining > WATCH_RENEWAL_SKEW_SECONDS:
            return {
                "status": "active",
                "history_id": state.get("gmail_history_id"),
                "watch_expires_at": exp.isoformat(),
            }

    token = decrypt_token(state["google_refresh_token"])
    access_token = get_access_token_from_refresh(token, trace_id)
    service = build_gmail_service(access_token)
    request = {
        "labelIds": ["INBOX"],
        "labelFilterBehavior": "INCLUDE",
        "topicName": _topic_name(),
    }
    response = service.users().watch(userId="me", body=request).execute()
    history_id = str(response.get("historyId") or "")
    watch_expiration = response.get("expiration")
    if not history_id or not watch_expiration:
        raise RuntimeError("Gmail watch response did not include historyId/expiration.")

    update_gmail_watch_state(uid, history_id, watch_expiration)
    logging.info(
        f"[{trace_id}] ensure_gmail_watch: watch active for user {uid}, history_id={history_id}"
    )
    return {
        "status": "renewed",
        "history_id": history_id,
        "watch_expires_at": datetime.fromtimestamp(
            int(watch_expiration) / 1000, tz=timezone.utc
        ).isoformat(),
    }


def stop_gmail_watch_for_user(uid: str, trace_id: str) -> None:
    state = get_gmail_sync_state(uid)
    if not state or not state.get("google_refresh_token"):
        clear_gmail_sync_state(uid)
        return

    try:
        token = decrypt_token(state["google_refresh_token"])
        access_token = get_access_token_from_refresh(token, trace_id)
        build_gmail_service(access_token).users().stop(userId="me").execute()
    except Exception as e:
        logging.warning(f"[{trace_id}] stop_gmail_watch_for_user: Google stop failed: {e}")
    finally:
        clear_gmail_sync_state(uid)


def sync_history_for_user(
    uid: str, trace_id: str, target_history_id: Optional[str] = None
) -> Dict:
    state = get_gmail_sync_state(uid)
    if not state or not state.get("google_refresh_token"):
        return {"status": "skipped", "reason": "not_connected"}

    start_history_id = state.get("gmail_history_id")
    if not start_history_id:
        return fallback_time_window_sync(uid, trace_id, target_history_id)

    token = decrypt_token(state["google_refresh_token"])
    access_token = get_access_token_from_refresh(token, trace_id)

    try:
        message_ids, latest_history_id = fetch_history_message_ids(
            access_token, trace_id, start_history_id
        )
    except HttpError as e:
        if _is_invalid_history_error(e):
            logging.warning(
                f"[{trace_id}] sync_history_for_user: history cursor expired; using bounded fallback"
            )
            return fallback_time_window_sync(uid, trace_id, target_history_id)
        raise

    queued = enqueue_fetch_batches(uid, trace_id, access_token, message_ids)
    next_history_id = str(target_history_id or latest_history_id or start_history_id)
    update_gmail_history_id(uid, next_history_id)
    return {
        "status": "success",
        "message_count": len(message_ids),
        "queued_batches": queued,
        "history_id": next_history_id,
    }


def fallback_time_window_sync(
    uid: str, trace_id: str, target_history_id: Optional[str] = None
) -> Dict:
    state = get_gmail_sync_state(uid)
    token = decrypt_token(state["google_refresh_token"])
    access_token = get_access_token_from_refresh(token, trace_id)
    message_ids = fetch_message_ids(access_token, trace_id, days_back=14)
    queued = enqueue_fetch_batches(uid, trace_id, access_token, message_ids)
    watch_state = ensure_gmail_watch(uid, trace_id, force=True)
    next_history_id = str(target_history_id or watch_state.get("history_id") or "")
    if next_history_id:
        update_gmail_history_id(uid, next_history_id)
    return {
        "status": "fallback",
        "message_count": len(message_ids),
        "queued_batches": queued,
        "history_id": next_history_id,
    }


def enqueue_fetch_batches(
    uid: str, trace_id: str, access_token: str, message_ids: List[str]
) -> int:
    queued = 0
    for batch in chunk_list(dedupe_preserve_order(message_ids), EMAILS_PER_BATCH):
        fetch_content.delay(batch, encrypt_token(uid), trace_id, encrypt_token(access_token))
        queued += 1
    return queued


def fetch_history_message_ids(
    access_token: str, trace_id: str, start_history_id: str
) -> Tuple[List[str], Optional[str]]:
    service = build_gmail_service(access_token)
    message_ids: List[str] = []
    latest_history_id = None
    page_token = None

    while True:
        request = (
            service.users()
            .history()
            .list(
                userId="me",
                startHistoryId=start_history_id,
                historyTypes=["messageAdded"],
                labelId="INBOX",
                pageToken=page_token,
            )
        )
        data = request.execute()
        latest_history_id = data.get("historyId") or latest_history_id
        message_ids.extend(extract_message_ids_from_history(data.get("history", [])))
        page_token = data.get("nextPageToken")
        if not page_token:
            break

    logging.info(
        f"[{trace_id}] fetch_history_message_ids: found {len(message_ids)} message IDs"
    )
    return dedupe_preserve_order(message_ids), latest_history_id


def extract_message_ids_from_history(history_records: List[Dict]) -> List[str]:
    ids: List[str] = []
    for record in history_records or []:
        for item in record.get("messagesAdded", []) or []:
            message_id = (item.get("message") or {}).get("id")
            if message_id:
                ids.append(message_id)
    return dedupe_preserve_order(ids)


def dedupe_preserve_order(values: Iterable[str]) -> List[str]:
    seen = set()
    result = []
    for value in values:
        if value in seen:
            continue
        seen.add(value)
        result.append(value)
    return result


def build_gmail_service(access_token: str):
    return build(
        "gmail",
        "v1",
        credentials=Credentials(token=access_token),
        cache_discovery=False,
    )


def _is_invalid_history_error(error: HttpError) -> bool:
    status = getattr(getattr(error, "resp", None), "status", None)
    text = str(error).lower()
    return status in {400, 404} and (
        "starthistoryid" in text or "history" in text or "invalid" in text
    )


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
        if start_date.tzinfo is None:
            start_date = start_date.replace(tzinfo=timezone.utc)
        days_to_sync = (datetime.now(timezone.utc) - start_date).days
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
        if row_ids:
            create_processing_placeholders(trace_id, row_ids)
            enqueue_model_processing(trace_id, row_ids)
        else:
            logging.info(
                f"[{trace_id}] model: no new staging rows to process; skipping classification"
            )
        
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
    service = build_gmail_service(access_token)

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
                fields="id,threadId,historyId,internalDate,snippet,payload",
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

            body_text = extract_plain_text_from_payload(payload, trace_id=trace_id)
            if not body_text:
                body_text = _normalize_extracted_text(resp.get("snippet", ""))

            parsed_emails.append(
                {
                    "user_id": uid,
                    "trace_id": trace_id,
                    "provider": "google",
                    "provider_message_id": resp.get("id", msg_id),
                    "provider_thread_id": resp.get("threadId"),
                    "provider_history_id": resp.get("historyId"),
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


def extract_plain_text_from_payload(
    payload: Dict,
    depth: int = 0,
    trace_id: Optional[str] = None,
) -> str:
    """
    Attempts to extract plaintext body.
    Priority:
        1. text/plain, unless it is clearly a skeletal fallback
        2. readable text/html
        3. fallback ""
    """
    if depth > 10:
        return ""

    plain_candidates: List[str] = []
    html_candidates: List[str] = []
    _collect_body_candidates(payload, depth, plain_candidates, html_candidates, trace_id)
    return _select_best_body_text(plain_candidates, html_candidates)


def _collect_body_candidates(
    payload: Dict,
    depth: int,
    plain_candidates: List[str],
    html_candidates: List[str],
    trace_id: Optional[str],
) -> None:
    if depth > 10 or not payload:
        return

    mime = str(payload.get("mimeType") or "").lower()
    body = payload.get("body", {}).get("data")

    if body:
        decoded = _decode_gmail_body(body)
        if mime == "text/plain":
            plain_candidates.append(_normalize_extracted_text(decoded))
        elif mime == "text/html":
            result = clean_email_body(decoded, mime, return_debug=True)
            _log_cleanup_debug(trace_id, result)
            html_candidates.append(result.text)

    for part in payload.get("parts", []) or []:
        _collect_body_candidates(part, depth + 1, plain_candidates, html_candidates, trace_id)


def _select_best_body_text(
    plain_candidates: List[str],
    html_candidates: List[str],
) -> str:
    plain_text = _longest_text(plain_candidates)
    html_text = _longest_text(html_candidates)

    if not plain_text:
        return html_text
    if not html_text:
        return plain_text

    if len(html_text) >= max(len(plain_text) * 2, len(plain_text) + 200):
        return html_text
    return plain_text


def _longest_text(candidates: List[str]) -> str:
    return max((candidate for candidate in candidates if candidate), key=len, default="")


def _normalize_extracted_text(text: str) -> str:
    return str(clean_email_body(text, "text/plain"))


def _decode_gmail_body(b64data: str) -> str:
    padded = b64data + ("=" * (-len(b64data) % 4))
    return base64.urlsafe_b64decode(padded).decode("utf-8", errors="ignore")


def strip_html(html: str) -> str:
    return str(clean_email_body(html, "text/html"))


def _log_cleanup_debug(
    trace_id: Optional[str],
    result: EmailBodyCleanupResult,
) -> None:
    if not trace_id or os.getenv("EMAIL_CLEANUP_DEBUG", "").lower() not in {"1", "true", "yes"}:
        return
    logging.debug(
        f"[{trace_id}] email cleanup content_type={result.content_type_used} "
        f"raw_len={result.raw_text_length} cleaned_len={result.cleaned_text_length} "
        f"html_nodes_removed={result.html_nodes_removed} "
        f"boilerplate_lines_removed={result.boilerplate_lines_removed} "
        f"preview={result.preview!r}"
    )



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
                "provider_thread_id": e.get("provider_thread_id"),
                "provider_history_id": e.get("provider_history_id"),
                "subject_enc": encrypt_token(e["subject"]),
                "sender_enc": encrypt_token(e["sender"]),
                "received_at": e["received_at"],
                "body_enc": encrypt_token(e["body_text"]),
                "status": EmailStatus.AWAIT_CLASSIFICATION.value,
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
    if not row_ids:
        logging.info(f"[{trace_id}] model: no row IDs provided; skipping classification")
        return

    logging.info(
        f"[{trace_id}] model: enqueuing batch of {len(row_ids)} rows for rule classification"
    )
    celery_app.send_task(
        TaskType.CLASSIFICATION_MODEL.task_name,
        args=[trace_id, row_ids],
        queue=TaskType.CLASSIFICATION_MODEL.queue_name,
    )


def create_processing_placeholders(trace_id: str, row_ids: List[str]) -> dict:
    result = insert_processing_placeholders_from_staging(trace_id, row_ids)
    if result.get("status") == "failure":
        raise RuntimeError(result.get("error", "processing placeholder insert failed"))
    logging.info(
        f"[{trace_id}] processing: placeholder rows affected={result.get('rows_affected', 0)}"
    )
    return result

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

