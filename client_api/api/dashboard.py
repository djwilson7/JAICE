from fastapi import APIRouter, Depends, HTTPException
from starlette import status

from common.logger import get_logger
from client_api.services.supabase_client import get_connection
from client_api.deps.auth import get_current_user

logging = get_logger()
router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

# Applications By Category Card
@router.get(
    "/apps-by-category",
    summary="Get counts of applications grouped by job category",
)
async def apps_by_category(user: dict = Depends(get_current_user)):
    uid = user.get("uid")
    logging.info(f"Fetching apps-by-category for user {uid}")
    
    # Treat NULL as "Other" so they still show on chart
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
        
# Applications Over Time Card
@router.get(
    "/apps-over-time",
    summary="Get monthly counts of applications grouped by stage",
)
async def apps_over_time(user: dict = Depends(get_current_user)):
    uid = user.get("uid")
    logging.info(f"Fetching apps-over-time for user {uid}")

    # Query: Count apps by month and stage
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
        GROUP BY month, app_stage
        ORDER BY month ASC;
    """

    try:
        async with get_connection() as conn:
            rows = await conn.fetch(query, uid)

        # Month/stage structure
        months = ["Jan","Feb","Mar","Apr","May","Jun",
                  "Jul","Aug","Sep","Oct","Nov","Dec"]

        stages = ["Applied", "Interview", "Offer", "Accepted"]

        result = {
            month: {stage: 0 for stage in stages}
            for month in months
        }

        # Fill from DB rows
        for r in rows:
            month_index = r["month"].month - 1
            month = months[month_index]
            stage = r["app_stage"]
            count = r["count"]

            if stage in stages:
                result[month][stage] = count

        return {"status": "success", "data": result}

    except Exception as e:
        logging.error(f"Error fetching apps-over-time: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching monthly stage trends."
        )
