from fastapi import APIRouter, Depends, HTTPException
from starlette import status
from datetime import datetime, timedelta, timezone

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

# ------------------------------------------------------------
# Avg Time in Stage (Rolling 90-day averages)
# ------------------------------------------------------------
@router.get(
    "/avg-time-in-stage",
    summary="Get rolling 90-day average time (in days) applications sit in each stage",
)
async def avg_time_in_stage(user: dict = Depends(get_current_user)):
    uid = user.get("uid")
    logging.info(f"Fetching avg-time-in-stage (sitting in stage) for user {uid}")
    
    query = """
        SELECT
            COALESCE(avg_applied, 0.0)   AS applied,
            COALESCE(avg_interview, 0.0) AS interview,
            COALESCE(avg_offer, 0.0)     AS offer,
            COALESCE(avg_accepted, 0.0)  AS accepted
        FROM (
            SELECT
                AVG(
                    CASE WHEN app_stage = 'Applied'
                         THEN EXTRACT(EPOCH FROM (now() AT TIME ZONE 'utc' - updated_at)) / 86400.0
                    END
                ) AS avg_applied,
                AVG(
                    CASE WHEN app_stage = 'Interview'
                         THEN EXTRACT(EPOCH FROM (now() AT TIME ZONE 'utc' - updated_at)) / 86400.0
                    END
                ) AS avg_interview,
                AVG(
                    CASE WHEN app_stage = 'Offer'
                         THEN EXTRACT(EPOCH FROM (now() AT TIME ZONE 'utc' - updated_at)) / 86400.0
                    END
                ) AS avg_offer,
                AVG(
                    CASE WHEN app_stage = 'Accepted'
                         THEN EXTRACT(EPOCH FROM (now() AT TIME ZONE 'utc' - updated_at)) / 86400.0
                    END
                ) AS avg_accepted
            FROM public.job_applications
            WHERE user_uid = $1
              AND is_deleted = FALSE
              AND is_archived = FALSE
              AND updated_at IS NOT NULL
              AND updated_at >= now() AT TIME ZONE 'utc' - INTERVAL '90 days'
              AND app_stage IN ('Applied','Interview','Offer','Accepted')
        ) sub;
    """
    
    try:
        async with get_connection() as conn:
            row = await conn.fetchrow(query, uid)

        if not row:
            averages = {
                "applied": 0.0,
                "interview": 0.0,
                "offer": 0.0,
                "accepted": 0.0,
            }
        else:
            averages = {
                "applied": float(row["applied"] or 0.0),
                "interview": float(row["interview"] or 0.0),
                "offer": float(row["offer"] or 0.0),
                "accepted": float(row["accepted"] or 0.0),
            }

        # ✅ Match other endpoints: wrap in {status, data}
        return {
            "status": "success",
            "data": averages,
        }

    except Exception as e:
        logging.error(f"Error fetching avg-time-in-stage for user {uid}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error calculating average time in stage.",
        )

# ------------------------------------------------------------
# Avg Applications Per Week
# ------------------------------------------------------------
@router.get(
    "/avg-apps-per-week",
    summary="Get 10-week trend of average applications per week",
)
async def avg_apps_per_week(user: dict = Depends(get_current_user)):
    """
    Returns the last 10 weeks of application counts (per week) for the user.
    Weeks are based on the time the application was received (received_at),
    falling back to updated_at when needed.
    """
    uid = user.get("uid")
    logging.info(f"Fetching avg-apps-per-week for user {uid}")

    # current time in UTC (used to build the week buckets)
    now = datetime.now(timezone.utc)

    query = """
        WITH app_events AS (
            SELECT
                -- Prefer received_at (epoch ms text) when present/valid,
                -- else fall back to updated_at.
                CASE
                    WHEN received_at IS NOT NULL
                         AND received_at <> ''
                         AND received_at ~ '^[0-9]+$'
                    THEN to_timestamp(received_at::bigint / 1000.0)
                    ELSE updated_at
                END AS event_ts
            FROM public.job_applications
            WHERE user_uid = $1
              AND is_deleted = FALSE
              AND is_archived = FALSE
        )
        SELECT
            date_trunc('week', event_ts) AS week_start,
            COUNT(*)::int AS count
        FROM app_events
        WHERE event_ts IS NOT NULL
          AND event_ts >= timezone('utc', now()) - INTERVAL '10 weeks'
        GROUP BY week_start
        ORDER BY week_start ASC;
    """

    try:
        async with get_connection() as conn:
            rows = await conn.fetch(query, uid)

        # Map week_start -> count
        counts_by_week = {r["week_start"].date(): r["count"] for r in rows}

        # Build a contiguous 10-week window ending this week.
        # Align to the same week start as date_trunc('week', ...) (Monday).
        start_week = now - timedelta(weeks=9)
        start_week = start_week - timedelta(days=start_week.weekday())  # Monday

        week_starts = [start_week + timedelta(weeks=i) for i in range(10)]

        labels = [f"W{i+1}" for i in range(10)]
        values = [counts_by_week.get(ws.date(), 0) for ws in week_starts]

        return {
            "labels": labels,
            "values": values,
        }

    except Exception as e:
        logging.error(f"Error fetching avg-apps-per-week for user {uid}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error calculating weekly application averages.",
        )

# ------------------------------------------------------------
# Grit Card
# ------------------------------------------------------------
@router.get(
    "/grit-score",
    summary="Get Grit Score + supporting metrics",
)
async def grit_score(user: dict = Depends(get_current_user)):
    uid = user.get("uid")
    logging.info(f"Fetching grit-score for user {uid}")
    
    try:
        async with get_connection() as conn:
            # 1. Weekly Application Count (last 7 days)
            weekly_query = """
            SELECT COUNT(*)::int AS apps
            FROM public.job_applications
            WHERE user_uid = $1
                AND is_deleted = FALSE
                AND is_archived = FALSE
                AND received_at ~ '[0-9]+$'
                AND (
                    CASE
                        WHEN received_at ~ '^[0-9]+$'
                            THEN to_timestamp(received_at::bigint / 1000)
                        ELSE received_at::timestamptz
                    END
                ) >= now() - INTERVAL '7 days';
            """
            weekly_row = await conn.fetchrow(weekly_query, uid)
            weekly_apps = weekly_row["apps"] if weekly_row else 0
            
            # 2. Follow-ups (last 30 days)
            follow_query = """
            SELECT COUNT(*)::int as cnt
            FROM public.job_applications
            WHERE user_uid = $1
                AND is_deleted = FALSE
                AND is_archived = FALSE
                AND updated_at >= now() - INTERVAL '30 days';
            """
            follow_row = await conn.fetchrow(follow_query, uid)
            followups = follow_row["cnt"] if follow_row else 0
            
            # 3. Consistency (days user applied at least once)
            consistency_query = """
            SELECT COUNT(*)::int AS active_days
            FROM (
                SELECT DATE(
                    CASE
                        WHEN received_at ~ '^[0-9]+$'
                            THEN to_timestamp(received_at::bigint / 1000)
                        ELSE received_at::timestamptz
                    END
                ) AS day
                FROM public.job_applications
                WHERE user_uid = $1
                    AND is_deleted = FALSE
                    AND is_archived = FALSE
                    AND received_at IS NOT NULL
                GROUP BY day
            ) sub;
            """
            cons_row = await conn.fetchrow(consistency_query, uid)
            active_days = cons_row["active_days"] if cons_row else 0
            
            # Convert raw metrics into a score
            score = min(
                100,
                (weekly_apps * 6) + (followups * 4) + (active_days * 0.5)
            )
        return {
            "score": round(score),
            "weekly_apps": weekly_apps,
            "followups": followups,
            "consistency": active_days,
        }
    except Exception as e:
        logging.error(f"Error fetching grit-score for user {uid}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error calculating Grit Score.",
        )