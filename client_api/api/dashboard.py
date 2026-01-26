from fastapi import APIRouter, Depends, HTTPException
from starlette import status
from datetime import datetime, timedelta, timezone, date

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

        data = [{"category": r["job_category"], "count": r["count"]} for r in rows]

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
        logging.info(f"apps-by-stage labels: {labels}, values: {values}")
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
# split by stage (monthly counts)
# ------------------------------------------------------------
@router.get(
    "/split-by-stage-monthly",
    summary="Get monthly counts of applications grouped by stage",
)
async def split_by_stage_monthly(user: dict = Depends(get_current_user)):
    """
    For the last 4 months:
    - Bucket by month based on received_at
    - Count how many applications are in each app_stage
    - retuns month and stage splits
    """
    uid = user.get("uid")
    logging.info(f"Fetching split-by-stage-monthly for user {uid}")

    query = """
        SELECT
            date_trunc('month', received_at::timestamp)::date AS month_start,
            app_stage,
            COUNT(*)::int AS count
        FROM public.job_applications
        WHERE user_uid = $1
        AND is_deleted = FALSE
        AND is_archived = FALSE
        AND received_at IS NOT NULL
        AND received_at::timestamp >= date_trunc(
                'month',
                timezone('utc', now())
            ) - INTERVAL '3 months'
        GROUP BY month_start, app_stage
        ORDER BY month_start ASC;
    """

    from datetime import date
    from dateutil.relativedelta import relativedelta

    try:
        async with get_connection() as conn:
            rows = await conn.fetch(query, uid)

        today = date.today()
        current_month = today.replace(day=1)

        month_starts = [current_month - relativedelta(months=3 - i) for i in range(4)]

        labels = [m.strftime("%b") for m in month_starts]

        stage_keys = ["applied", "interview", "offer", "accepted"]

        stage_map_db_to_key = {
            "Applied": "applied",
            "Interview": "interview",
            "Offer": "offer",
            "Accepted": "accepted",
        }

        stage_counts = {stage: [0] * 4 for stage in stage_keys}

        month_index_map = {m: i for i, m in enumerate(month_starts)}

        for r in rows:
            month = r["month_start"]
            stage_key = stage_map_db_to_key.get(r["app_stage"])
            if stage_key is None:
                continue

            idx = month_index_map.get(month)
            if idx is None:
                continue

            stage_counts[stage_key][idx] += r["count"] or 0
        logging.info(
            f"split-by-stage-monthly labels: {labels}, stage_counts: {stage_counts}"
        )
        return {
            "status": "success",
            "data": {
                "labels": labels,
                "stage_counts": stage_counts,
            },
        }

    except Exception as e:
        logging.error(f"Error fetching split-by-stage-monthly for user {uid}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching monthly stage trends.",
        )


# ------------------------------------------------------------
# Stages Over Time Card (Line)
# ------------------------------------------------------------
@router.get(
    "/stages-over-time",
    summary="Get cumulative application counts by stage over the last 90 days",
)
async def stages_over_time(user: dict = Depends(get_current_user)):
    uid = user.get("uid")
    logging.info(f"Fetching stages-over-time for user {uid}")

    query = """
        SELECT
            received_at::date AS day,
            app_stage,
            COUNT(*)::int AS count
        FROM public.job_applications
        WHERE user_uid = $1
          AND is_deleted = FALSE
          AND is_archived = FALSE
          AND received_at IS NOT NULL
          AND received_at::timestamp >= timezone('utc', now()) - INTERVAL '90 days'
        GROUP BY day, app_stage
        ORDER BY day ASC;
    """

    try:
        async with get_connection() as conn:
            rows = await conn.fetch(query, uid)

        today = date.today()
        days = [today - timedelta(days=i) for i in range(89, -1, -1)]
        labels = [d.isoformat() for d in days]

        stage_keys = ["applied", "interview", "offer", "accepted"]

        stage_map_db_to_key = {
            "Applied": "applied",
            "Interview": "interview",
            "Offer": "offer",
            "Accepted": "accepted",
        }

        stage_counts = {stage: [0] * 90 for stage in stage_keys}
        day_index = {d: i for i, d in enumerate(days)}

        for r in rows:
            day = r["day"]
            stage_key = stage_map_db_to_key.get(r["app_stage"])
            if stage_key is None:
                continue

            idx = day_index.get(day)
            if idx is None:
                continue

            stage_counts[stage_key][idx] += r["count"] or 0

        for stage in stage_keys:
            running_total = 0
            for i in range(90):
                running_total += stage_counts[stage][i]
                stage_counts[stage][i] = running_total

        return {
            "status": "success",
            "data": {
                "labels": labels,
                "stage_counts": stage_counts,
            },
        }

    except Exception as e:
        logging.error(f"Error fetching stages-over-time for user {uid}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching stage trends over time.",
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
                         THEN EXTRACT(EPOCH FROM (now() AT TIME ZONE 'utc' - received_at::timestamp)) / 86400.0
                    END
                ) AS avg_applied,
                AVG(
                    CASE WHEN app_stage = 'Interview'
                         THEN EXTRACT(EPOCH FROM (now() AT TIME ZONE 'utc' - received_at::timestamp)) / 86400.0
                    END
                ) AS avg_interview,
                AVG(
                    CASE WHEN app_stage = 'Offer'
                         THEN EXTRACT(EPOCH FROM (now() AT TIME ZONE 'utc' - received_at::timestamp)) / 86400.0
                    END
                ) AS avg_offer,
                AVG(
                    CASE WHEN app_stage = 'Accepted'
                         THEN EXTRACT(EPOCH FROM (now() AT TIME ZONE 'utc' - received_at::timestamp)) / 86400.0
                    END
                ) AS avg_accepted
            FROM public.job_applications
            WHERE user_uid = $1
              AND is_deleted = FALSE
              AND is_archived = FALSE
              AND received_at IS NOT NULL
              AND received_at::timestamp >= now() AT TIME ZONE 'utc' - INTERVAL '90 days'
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

    now = datetime.now(timezone.utc)

    query = """
        SELECT
            date_trunc('week', received_at::timestamp)::date AS week_start,
            COUNT(*)::int AS count
        FROM public.job_applications
        WHERE user_uid = $1
        AND is_deleted = FALSE
        AND is_archived = FALSE
        AND received_at IS NOT NULL
        AND received_at::timestamp >= timezone('utc', now()) - INTERVAL '10 weeks'
        GROUP BY week_start
        ORDER BY week_start ASC;
    """

    try:
        async with get_connection() as conn:
            rows = await conn.fetch(query, uid)

        counts_by_week = {r["week_start"]: r["count"] for r in rows}

        today = now.date()
        current_week_start = today - timedelta(days=today.weekday())

        week_starts = [current_week_start - timedelta(weeks=9 - i) for i in range(10)]

        values = [counts_by_week.get(ws, 0) for ws in week_starts]
        labels = [
            f"WK {ws.isocalendar().week} ({10 - i})" for i, ws in enumerate(week_starts)
        ]
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
            score = min(100, (weekly_apps * 6) + (followups * 4) + (active_days * 0.5))
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


@router.get(
    "/activity-heatmap",
    summary="Get daily application counts for the last 12 weeks",
)
async def activity_heatmap(user: dict = Depends(get_current_user)):
    """
    Returns daily application counts formatted for a calendar heatmap.
    Each data point contains:
    - x: ISO week number
    - y: Day of week (0 = Sunday, 6 = Saturday)
    - v: Number of applications submitted that day
    Missing days are returned with v=0.
    """
    uid = user.get("uid")
    logging.info(f"Fetching activity-heatmap for user {uid}")

    query = """
        SELECT
            DATE(received_at) AS day,
            COUNT(*)::int AS app_count
        FROM public.job_applications
        WHERE user_uid = $1
          AND is_deleted = FALSE
          AND is_archived = FALSE
          AND received_at IS NOT NULL
          AND DATE(received_at) >= timezone('utc', now()) - INTERVAL '84 days'
        GROUP BY day
        ORDER BY day;
    """

    try:
        async with get_connection() as conn:
            rows = await conn.fetch(query, uid)

        counts_by_day = {r["day"]: r["app_count"] for r in rows}
        logging.info(f"Raw counts_by_day: {counts_by_day}")

        today = date.today()
        start_date = today - timedelta(days=83)
        full_data_dict = {}

        def getWeek(d: date) -> str:
            iso_calendar = d.isocalendar()
            return "WK " + str(iso_calendar[1]) 
        
        dow_labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        
        def getDOW(d: date) -> str:
            py_weekday = d.weekday() 
            return dow_labels[(py_weekday + 1) % 7]  

        for i in range(84):
            d = start_date + timedelta(days=i)
            count = counts_by_day.get(d, 0)

            week = getWeek(d) 
            dow = getDOW(d)  

            key = (week, dow)
            if key not in full_data_dict:
                full_data_dict[key] = 0
            full_data_dict[key] += count

        full_data = [
            {"x": week, "y": dow, "v": v}
            for (week, dow), v in full_data_dict.items()
        ]

        return {
            "status": "success",
            "data": full_data,
        }

    except Exception as e:
        logging.error(f"Error fetching activity-heatmap for user {uid}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching daily application counts for heatmap.",
        )
