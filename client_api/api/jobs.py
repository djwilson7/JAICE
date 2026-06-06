from fastapi import APIRouter, Depends, HTTPException, Body
from starlette import status
import uuid

from common.logger import get_logger
from client_api.services.supabase_client import get_connection
from client_api.deps.auth import get_current_user

logging = get_logger()
router = APIRouter()


@router.post("/update")
async def update_job_application(
    payload: dict = Body(...), user: dict = Depends(get_current_user)
):
    """
    Update an existing job application.
    Expected payload:
        - provider_message_id (string)
        - job_title (string)
        - company_name (string)
        - app_stage (string)
        - salary (string to numeric)
        - received_at (YYYY-MM-DD)
        - notes (string)
    """
    trace_id = str(uuid.uuid4())
    uid = user.get("uid")

    provider_ids = payload.get("provider_message_ids") or payload.get(
        "provider_message_id"
    )

    if not provider_ids:
        raise HTTPException(status_code=400, detail="provider_message_id is required")

    # get fields
    job_title = payload.get("title") or payload.get("job_title")
    company_name = payload.get("company_name") or payload.get("company")
    app_stage = payload.get("app_stage")
    salary = payload.get("salary")
    received_at = payload.get("received_at") or payload.get("date")
    notes = payload.get("note") or payload.get("notes")

    # build a update staement that sets provided columns
    set_clauses = []
    params = []
    inex = 1

    if job_title is not None:
        set_clauses.append(f"title = ${inex}")
        params.append(job_title)
        inex += 1
    if company_name is not None:
        set_clauses.append(f"company_name = ${inex}")
        params.append(company_name)
        inex += 1
    if app_stage is not None:
        set_clauses.append(f"app_stage = ${inex}")
        params.append(app_stage.capitalize())
        inex += 1
    if salary is not None:
        set_clauses.append(f"salary = ${inex}")
        params.append(float(salary))
        inex += 1
    if received_at is not None:
        set_clauses.append(f"received_at = ${inex}")
        params.append(received_at)
        inex += 1
    if notes is not None:
        set_clauses.append(f"note = ${inex}")
        params.append(notes)
        inex += 1

    if not set_clauses:
        raise HTTPException(status_code=400, detail="No fields to update provided")

    sql_set = ", ".join(set_clauses)
    query = f"""
        UPDATE public.job_applications
        SET {sql_set}, updated_at = now()
        WHERE provider_message_id = ANY(${inex})
        AND user_uid = ${inex + 1}
        RETURNING *
    """

    try:
        async with get_connection() as conn:
            results = await conn.fetch(query, *params, provider_ids, uid)

        count = len(results)
        if count == 0:
            raise HTTPException(status_code=404, detail="No matching jobs found")

        logging.info(f"[{trace_id}] Updated {count} job(s) for user {uid}.")
        return {"status": "success", "updated_jobs": [dict(r) for r in results]}

    except Exception as e:
        logging.error(f"[{trace_id}] Error updating job application: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/create")
async def create_job_application(
    payload: dict = Body(...), user: dict = Depends(get_current_user)
):
    """
    Create a new job application.

    Expected payload:
        - job_title / title (string)           required
        - company_name (string)        optional
        - app_stage (string)           optional
        - salary (string to numeric)   optional
        - received_at (YYYY-MM-DD)     optional, defaults to today if not provided
        - notes (string)               optional

    Returns: {"status": "success", "job_application": {row}}

    """

    import datetime

    trace_id = str(uuid.uuid4())
    uid = user.get("uid")

    # client sends payload
    job_title = payload.get("title") or payload.get("job_title")
    company_name = payload.get("company_name") or payload.get("company")
    app_stage = payload.get("app_stage") or "Applied"
    salary = payload.get("salary")
    received_at = payload.get("received_at") or payload.get("date")
    notes = payload.get("note") or payload.get("notes") or None

    if not job_title:
        raise HTTPException(status_code=400, detail="Job title is required")
    if not received_at:
        # if not provided, default to today
        received_at = datetime.date.today().isoformat()

    # normalize state
    stage = app_stage.capitalize()
    salary = float(salary) if salary else None

    provider_message_id = str(uuid.uuid4())
    provider_source = payload.get("provider_source", "manual_entry")

    query = """
        INSERT INTO public.job_applications (
            user_uid,
            title,
            company_name,
            app_stage,
            salary,
            received_at,
            note,
            provider_message_id,
            provider_source,
            updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
        RETURNING *
    """

    try:
        async with get_connection() as conn:
            row = await conn.fetchrow(
                query,
                uid,
                job_title,
                company_name,
                stage,
                salary,
                received_at,
                notes,
                provider_message_id,
                provider_source,
            )

        if not row:
            raise HTTPException(
                status_code=500, detail="Failed to create job application"
            )

        logging.info(
            f"[{trace_id}] Created job application {provider_message_id} for user {uid}."
        )
        return {"status": "success", "job_application": dict(row)}

    except Exception as e:
        logging.error(f"[{trace_id}] Error creating job application: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/set-review-needed")
async def set_review_needed(
    payload: dict = Body(...), user: dict = Depends(get_current_user)
):
    """
    Payload:
        {
            "provider_message_ids": ["msgId1", "msgId2"],
            "needs_review": false
        }
    """
    trace_id = str(uuid.uuid4())
    uid = user.get("uid")
    message_ids = payload.get("provider_message_ids")
    needs_review = payload.get("needs_review")

    if message_ids is None or needs_review is None:
        raise HTTPException(status_code=400, detail="Missing required data")

    query = """
        UPDATE public.job_applications
        SET needs_review = $1
        WHERE provider_message_id = ANY($2)
        AND user_uid = $3
        RETURNING provider_message_id, needs_review, updated_at
    """

    try:
        async with get_connection() as conn:
            results = await conn.fetch(query, needs_review, message_ids, uid)

        count = len(results)
        logging.info(
            f"[{trace_id}] Updated needs_review to {needs_review} for {count} job(s) for user {uid}."
        )
        return {
            "status": "success",
            "count": count,
            "updated": [dict(r) for r in results],
        }

    except Exception as e:
        logging.error(f"[{trace_id}] Error updating review state: {e}")
        raise HTTPException(status_code=500, detail=str(e))


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


# Get Deleted Jobs
@router.get("/trash", summary="Get users deleted job applications")
async def get_trashed_jobs(user: dict = Depends(get_current_user)):

    uid = user.get("uid")
    query = """
    SELECT *
    FROM public.job_applications
    WHERE user_uid = $1 AND is_deleted = TRUE
    ORDER BY updated_at DESC
    """

    try:
        async with get_connection() as conn:
            rows = await conn.fetch(query, uid)
            return {"status": "success", "jobs": [dict(r) for r in rows]}

    except Exception as e:
        logging.error(f"Error fetching trash jobs for user {uid}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Get Archived Jobs
@router.get("/archive", summary="Get user's archived job applications")
async def get_archive(user: dict = Depends(get_current_user)):
    uid = user.get("uid")
    query = """
    SELECT *
    FROM public.job_applications
    WHERE user_uid = $1 AND is_archived = TRUE
    ORDER BY updated_at DESC
    """
    try:
        async with get_connection() as conn:
            rows = await conn.fetch(query, uid)
            return {"status": "success", "jobs": [dict(r) for r in rows]}
    except Exception as e:
        logging.error(f"Error fetching archived jobs for user {uid}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/permanently-delete", summary="Permanently delete job applications")
async def permanent_delete_jobs(
    payload: dict = Body(...), user: dict = Depends(get_current_user)
):
    """
    Permanently delete job applications.
    Expected payload:
        - provider_message_ids (list of strings)
        - confirm (bool): must be True to proceed
    Returns: {"status": "success", "deleted_count": int, "deleted_ids": [list of strings]}
    """
    trace_id = str(uuid.uuid4())
    uid = user.get("uid")

    message_ids = payload.get("provider_message_ids")
    confirm = payload.get("confirm")

    if (
        not message_ids
        or not isinstance(message_ids, (list, tuple))
        or len(message_ids) == 0
    ):
        raise HTTPException(
            status_code=400, detail="Missing required data or confirmation"
        )

    if confirm is not True:
        raise HTTPException(status_code=400, detail="Deletion not confirmed")

    query = """
        DELETE FROM public.job_applications
        WHERE provider_message_id = ANY($1)
        AND user_uid = $2
        RETURNING provider_message_id
    """

    try:
        async with get_connection() as conn:
            deleted_rows = await conn.fetch(query, message_ids, uid)

        count = len(deleted_rows)

        if count == 0:
            raise HTTPException(
                status_code=404, detail="No matching jobs found to delete"
            )

        logging.info(f"[{trace_id}] Permanently deleted {count} job(s) for user {uid}.")

        return {
            "status": "success",
            "count": count,
            "deleted": [r["provider_message_id"] for r in deleted_rows],
        }

    except Exception as e:
        logging.error(f"[{trace_id}] Error permanently deleting job applications: {e}")

        raise HTTPException(status_code=500, detail=str(e))


@router.post("/snapshot-update", summary="Batch update jobs for undo/redo")
async def snapshot_update_jobs(
    payload: dict = Body(...),
    user: dict = Depends(get_current_user),
):
    """
    Expected payload:
        - jobs: list of job snapshots
          Each job should include:
          provider_message_id, title, company_name, app_stage,
          salary, received_at, note, is_deleted, is_archived, needs_review
    """
    trace_id = str(uuid.uuid4())
    uid = user.get("uid")
    jobs = payload.get("jobs")

    if not jobs or not isinstance(jobs, list):
        raise HTTPException(status_code=400, detail="jobs[] is required")

    updated_rows = []
    try:
        async with get_connection() as conn:
            for job in jobs:
                logging.info("Updating job snapshot:", job)
                pid = job.get("provider_message_id")
                if not pid:
                    raise HTTPException(
                        status_code=400, detail="Missing provider_message_id"
                    )

                query = """
                    UPDATE public.job_applications
                    SET
                        title = $1,
                        company_name = $2,
                        app_stage = $3,
                        salary = $4,
                        received_at = $5,
                        note = $6,
                        is_deleted = $7,
                        is_archived = $8,
                        needs_review = $9,
                        updated_at = now()
                    WHERE provider_message_id = $10
                      AND user_uid = $11
                    RETURNING *;
                """

                row = await conn.fetchrow(
                    query,
                    job.get("title"),
                    job.get("company_name"),
                    job.get("app_stage"),
                    job.get("salary"),
                    job.get("received_at"),
                    job.get("note"),
                    job.get("is_deleted", False),
                    job.get("is_archived", False),
                    job.get("needs_review", False),
                    pid,
                    uid,
                )
                if row:
                    updated_rows.append(dict(row))

        logging.info(f"[{trace_id}] Updated {len(updated_rows)} job(s) for user {uid}")

        return {
            "status": "success",
            "count": len(updated_rows),
            "updated": updated_rows,
        }

    except Exception as e:
        logging.error(f"[{trace_id}] Snapshot update failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/write-jobs-to-db", summary="Bulk update job cards from client")
async def write_jobs_to_db(
    payload: dict = Body(...),
    user: dict = Depends(get_current_user),
):
    """
    Bulk update jobs in the database.

    Expected payload:
        {
            "jobs_to_update": [JobCardType, ...]
        }

    Each job should have an `id` (maps to provider_message_id).
    UID is derived from the authenticated user.
    """
    trace_id = str(uuid.uuid4())
    uid = user.get("uid")
    jobs = payload.get("jobs_to_update")

    if not isinstance(jobs, list):
        raise HTTPException(status_code=400, detail="jobs_to_update must be a list")

    if not jobs:
        logging.info(f"[{trace_id}] No jobs to update for user {uid}")
        return {"status": "success", "count": 0}

    try:
        async with get_connection() as conn:
            for job in jobs:
                pid = job.get("id")
                if not pid:
                    logging.warning(f"[{trace_id}] Skipping job with missing id: {job}")
                    continue

                query = """
                    UPDATE public.job_applications
                    SET
                        title = $1,
                        company_name = $2,
                        app_stage = $3,
                        salary = $4,
                        received_at = $5,
                        note = $6,
                        is_deleted = $7,
                        is_archived = $8,
                        needs_review = $9,
                        updated_at = now()
                    WHERE provider_message_id = $10
                    AND user_uid = $11
                """

                await conn.execute(
                    query,
                    job.get("title"),
                    job.get("companyName"),
                    job.get("column"),
                    job.get("salary"),
                    job.get("date"),
                    job.get("notes"),
                    job.get("isDeleted", False),
                    job.get("isArchived", False),
                    job.get("reviewNeeded", False),
                    pid,
                    uid
                )

        logging.info(f"[{trace_id}] Successfully wrote {len(jobs)} job(s) to DB for user {uid}")
        return {"status": "success", "count": len(jobs)}

    except Exception as e:
        logging.error(f"[{trace_id}] Error writing jobs to DB: {e}")
        raise HTTPException(status_code=500, detail=str(e))
