from fastapi import APIRouter, Depends, HTTPException
from starlette import status

from common.logger import get_logger
from client_api.services.supabase_client import get_connection
from client_api.deps.auth import get_current_user

logging = get_logger()
router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


# ------------------------------------------------------------
# Applications By Category Card
# ------------------------------------------------------------
@router.get(
    "/apps-by-category",
    summary="Get counts of applications grouped by job category",
)
async def apps_by_category(user: dict = Depends(get_current_user)):
    uid = user.get("uid")
    logging.info(f"Fetching apps-by-category for user {uid}")

    query = """
        SELECT
            COALESCE(job_category, 'Other') AS job_category,
            COUNT(*)::int AS count
        FROM public.job_applications
        WHERE user_uid = $1
          AND is_deleted = FALSE
          AND is_archived = FALSE
        GROUP BY COALESCE(job_category, 'Other')
        ORDER BY job_category;
    """

    try:
        async with get_connection() as conn:
            rows = await conn.fetch(query, uid)

        data = [
            {"category": r["job_category"], "count": r["count"]}
            for r in rows
        ]

        return {"status": "success", "data": data}

    except Exception as e:
        logging.error(f"Error fetching apps-by-category for user {uid}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching apps by category.",
        )


# ------------------------------------------------------------
# Applications By Stage Card (Doughnut)
# ------------------------------------------------------------
@router.get(
    "/apps-by-stage",
    summary="Get total counts of applications grouped by stage",
)
async def apps_by_stage(user: dict = Depends(get_current_user)):
    """
    Returns total counts per stage (regardless of date) for the doughnut chart.
    """
    uid = user.get("uid")
    logging.info(f"Fetching apps-by-stage for user {uid}")

    query = """
        SELECT
            app_stage,
            COUNT(*)::int AS count
        FROM public.job_applications
        WHERE user_uid = $1
          AND is_deleted = FALSE
          AND is_archived = FALSE
        GROUP BY app_stage;
    """

    try:
        async with get_connection() as conn:
            rows = await conn.fetch(query, uid)

        # Only chart these four, ignore others like "Rejected" for now
        stage_order = ["Applied", "Interview", "Offer", "Accepted"]
        counts = {stage: 0 for stage in stage_order}

        for r in rows:
            stage = r["app_stage"]
            if stage in counts:
                counts[stage] = r["count"] or 0

        labels = stage_order
        values = [counts[s] for s in stage_order]

        return {
            "status": "success",
            "data": {
                "labels": labels,
                "values": values,
            },
        }

    except Exception as e:
        logging.error(f"Error fetching apps-by-stage for user {uid}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching apps by stage.",
        )


# ------------------------------------------------------------
# Applications Over Time / Stages Over Time Card (Line)
# ------------------------------------------------------------
@router.get(
    "/apps-over-time",
    summary="Get monthly counts of applications grouped by stage",
)
async def apps_over_time(user: dict = Depends(get_current_user)):
    """
    For the last 90 days:
    - Bucket by month based on updated_at
    - Count how many applications are in each app_stage
    - Return arrays per stage aligned with month labels
    """
    uid = user.get("uid")
    logging.info(f"Fetching apps-over-time for user {uid}")

    query = """
        SELECT
            DATE_TRUNC('month', updated_at) AS month,
            app_stage,
            COUNT(*)::int AS count
        FROM public.job_applications
        WHERE user_uid = $1
          AND is_deleted = FALSE
          AND is_archived = FALSE
          AND updated_at IS NOT NULL
          AND updated_at >= timezone('utc', now()) - INTERVAL '90 days'
        GROUP BY month, app_stage
        ORDER BY month ASC;
    """

    try:
        async with get_connection() as conn:
            rows = await conn.fetch(query, uid)

        month_labels = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
        ]

        stage_keys = ["applied", "interview", "offer", "accepted"]

        stage_map_db_to_key = {
            "Applied": "applied",
            "Interview": "interview",
            "Offer": "offer",
            "Accepted": "accepted",
            # "Rejected": "rejected",  # add later if you want
        }

        month_stage_counts = {
            m: {stage: 0 for stage in stage_keys}
            for m in month_labels
        }

        for r in rows:
            month_ts = r["month"]
            if month_ts is None:
                continue

            month_index = month_ts.month - 1
            if month_index < 0 or month_index > 11:
                continue

            month_label = month_labels[month_index]

            db_stage = r["app_stage"]
            stage_key = stage_map_db_to_key.get(db_stage)
            if stage_key is None:
                continue

            count = r["count"] or 0
            month_stage_counts[month_label][stage_key] += count

        applied = [month_stage_counts[m]["applied"] for m in month_labels]
        interview = [month_stage_counts[m]["interview"] for m in month_labels]
        offer = [month_stage_counts[m]["offer"] for m in month_labels]
        accepted = [month_stage_counts[m]["accepted"] for m in month_labels]

        return {
            "status": "success",
            "data": {
                "months": month_labels,
                "applied": applied,
                "interview": interview,
                "offer": offer,
                "accepted": accepted,
            },
        }

    except Exception as e:
        logging.error(f"Error fetching apps-over-time for user {uid}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching monthly stage trends.",
        )
