import uuid
import os

from celery import Celery
from fastapi import APIRouter, Depends, Request

from client_api.deps.auth import get_current_user
from client_api.utils.task_definitions import TaskType
from common.logger import get_logger

logging = get_logger()
router = APIRouter()

celery_client = Celery("gmail_api_client")
celery_client.conf.update(
    broker_url=str(
        os.getenv("CELERY_BROKER_URL_LOCAL") or os.getenv("CELERY_BROKER_URL_PROD")
    )
)


def is_missing_gmail_sync_column_error(error: Exception) -> bool:
    message = str(error)
    return "gmail_watch_expiration" in message and "does not exist" in message


@router.post("/sync-now", summary="Ensure Gmail watch and enqueue cursor catch-up sync.")
async def sync_now(request: Request, user: dict = Depends(get_current_user)):
    uid = user.get("uid")
    trace_id = str(uuid.uuid4())
    pool = request.app.state.pool

    watch_expires_at = None
    async with pool.acquire() as conn:
        record = await conn.fetchrow(
            """
            SELECT gmail_connected
            FROM public.user_account
            WHERE user_id = $1
            """,
            uid,
        )

    if not record or not record["gmail_connected"]:
        return {"status": "skipped", "trace_id": trace_id, "watch_expires_at": None}

    try:
        async with pool.acquire() as conn:
            watch_expiration = await conn.fetchval(
                """
                SELECT gmail_watch_expiration
                FROM public.user_account
                WHERE user_id = $1
                """,
                uid,
            )
    except Exception as e:
        if not is_missing_gmail_sync_column_error(e):
            raise
        logging.warning(
            f"[{trace_id}] Gmail Pub/Sub sync columns are missing for user {uid}; "
            "apply the Gmail Pub/Sub migration before running cursor sync."
        )
        return {
            "status": "migration_required",
            "trace_id": trace_id,
            "watch_expires_at": None,
        }

    if watch_expiration:
        watch_expires_at = watch_expiration.isoformat()

    dispatch_gmail_catch_up(uid, trace_id)
    logging.info(f"[{trace_id}] Enqueued Gmail catch-up sync for user {uid}")

    return {
        "status": "queued",
        "trace_id": trace_id,
        "watch_expires_at": watch_expires_at,
    }


def dispatch_gmail_catch_up(uid: str, trace_id: str):
    return celery_client.send_task(
        TaskType.GMAIL_CATCH_UP_SYNC.task_name,
        args=[uid, trace_id],
        queue=TaskType.GMAIL_CATCH_UP_SYNC.queue_name,
        headers={"trace_id": trace_id, "uid": uid},
    )
