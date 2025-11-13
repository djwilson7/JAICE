from fastapi import APIRouter, Depends, HTTPException, Body
from starlette import status
import uuid

from common.logger import get_logger
from client_api.services.supabase_client import get_connection
from client_api.deps.auth import get_current_user

logging = get_logger()
router = APIRouter()


@router.get(
    "/latest-jobs", summary="Get all the users latest job applications from supabase."
)
async def get_latest_jobs(user: dict = Depends(get_current_user)):
    logging.info(f"Fetching latest jobs for user from Supabase.")
    uid = user.get("uid")

    query = """
    SELECT *
    FROM public.job_applications
    WHERE user_uid = $1 AND is_deleted = FALSE AND is_archived = FALSE
    ORDER BY received_at DESC
    """

    try:
        async with get_connection() as conn:
            rows = await conn.fetch(query, uid)
            logging.info(f"Fetched {len(rows)} job applications for user.")
            return {"status": "success", "jobs": [dict(r) for r in rows]}

    except Exception as e:
        logging.error(f"Error fetching latest jobs for user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching job applications.",
        )


@router.post("/update-stage")
async def update_job_stage(
    payload: dict = Body(...), user: dict = Depends(get_current_user)
):
    trace_id = str(uuid.uuid4())
    uid = user.get("uid")
    provider_message_ids = payload.get("provider_message_ids", [])
    new_stage = payload.get("app_stage")

    if not provider_message_ids or not new_stage:
        raise HTTPException(status_code=400, detail="Missing required data")

    new_stage = new_stage.capitalize()

    query = """
        UPDATE public.job_applications
        SET app_stage = $1
        WHERE provider_message_id = ANY($2)
        AND user_uid = $3
        RETURNING provider_message_id, app_stage, updated_at
    """

    try:
        async with get_connection() as conn:
            results = await conn.fetch(query, new_stage, provider_message_ids, uid)

        count = len(results)
        if count == 0:
            raise HTTPException(status_code=404, detail="No matching jobs found")

        logging.info(
            f"[{trace_id}] Updated {count} job(s) to stage {new_stage} for user {uid}"
        )

        return {
            "status": "success",
            "count": count,
            "updated": [dict(r) for r in results],
        }

    except Exception as e:
        logging.error(f"[{trace_id}] Error updating job stage: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/set-archive")
async def flip_archived_state(
    payload: dict = Body(...), user: dict = Depends(get_current_user)
):
    trace_id = str(uuid.uuid4())
    uid = user.get("uid")
    message_ids = payload.get("provider_message_ids")

    if not message_ids:
        raise HTTPException(status_code=400, detail="Missing required data")

    query = """
        UPDATE public.job_applications
        SET is_archived = NOT is_archived
        WHERE provider_message_id = ANY($1)
        AND user_uid = $2
        RETURNING provider_message_id, is_archived, updated_at
    """

    try:
        async with get_connection() as conn:
            results = await conn.fetch(query, message_ids, uid)

        count = len(results)
        logging.info(
            f"[{trace_id}] Toggled archived state for {count} job(s) for user {uid}."
        )
        return {
            "status": "success",
            "count": count,
            "updated": [dict(r) for r in results],
        }

    except Exception as e:
        logging.error(f"[{trace_id}] Error toggling archived state: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/set-delete")
async def flip_deleted_state(
    payload: dict = Body(...), user: dict = Depends(get_current_user)
):
    trace_id = str(uuid.uuid4())
    uid = user.get("uid")
    message_ids = payload.get("provider_message_ids")

    if not message_ids:
        raise HTTPException(status_code=400, detail="Missing required data")

    query = """
        UPDATE public.job_applications
        SET is_deleted = NOT is_deleted
        WHERE provider_message_id = ANY($1)
        AND user_uid = $2
        RETURNING provider_message_id, is_deleted, updated_at
    """

    try:
        async with get_connection() as conn:
            results = await conn.fetch(query, message_ids, uid)

        count = len(results)
        logging.info(
            f"[{trace_id}] Toggled deleted state for {count} job(s) for user {uid}."
        )
        return {
            "status": "success",
            "count": count,
            "updated": [dict(r) for r in results],
        }

    except Exception as e:
        logging.error(f"[{trace_id}] Error toggling deleted state: {e}")
        raise HTTPException(status_code=500, detail=str(e))
