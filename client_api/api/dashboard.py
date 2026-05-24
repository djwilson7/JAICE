from fastapi import APIRouter, Depends, HTTPException
from starlette import status
from datetime import datetime, timedelta, timezone, date

from common.logger import get_logger
from client_api.services.supabase_client import get_connection
from client_api.deps.auth import get_current_user

logging = get_logger()
router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

RECEIVED_AT_TS_SQL = """
    CASE
        WHEN received_at IS NULL OR btrim(received_at) = '' THEN NULL
        WHEN received_at ~ '^[0-9]{13}$'
            THEN to_timestamp((received_at::numeric / 1000.0)::double precision)
        WHEN received_at ~ '^[0-9]{10}$'
            THEN to_timestamp(received_at::double precision)
        ELSE received_at::timestamptz
    END
"""

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
    - Calculates the snapshot date for each month (last day of month, or today if current month)
    - Reconstructs the historical application stages on those snapshot dates
    - Returns month labels and the stage split counts
    """
    uid = user.get("uid")
    logging.info(f"Fetching split-by-stage-monthly for user {uid}")

    jobs_query = f"""
        SELECT 
            id, 
            app_stage,
            {RECEIVED_AT_TS_SQL} AS received_at_ts
        FROM public.job_applications
        WHERE user_uid = $1
          AND is_deleted = FALSE
          AND is_archived = FALSE;
    """

    events_query = """
        SELECT 
            job_fk,
            new_value AS stage,
            timestamp_utc
        FROM public.app_events
        WHERE user_uid = $1
          AND event_type IN ('processed', 'stage_change')
        ORDER BY timestamp_utc ASC, event_id ASC;
    """

    from datetime import date
    from dateutil.relativedelta import relativedelta
    import calendar
    from collections import defaultdict

    try:
        # 1. Fetch active jobs and events
        async with get_connection() as conn:
            job_rows = await conn.fetch(jobs_query, uid)
            event_rows = await conn.fetch(events_query, uid)

        # 2. Get dynamic snapshot dates and labels for the last 4 months
        today = date.today()
        months = []
        for i in range(3, -1, -1):
            d = today - relativedelta(months=i)
            months.append((d.year, d.month))

        snapshot_dates = []
        labels = []
        for year, month in months:
            if year == today.year and month == today.month:
                snapshot_dates.append(today)
            else:
                last_day = calendar.monthrange(year, month)[1]
                snapshot_dates.append(date(year, month, last_day))
            
            labels.append(date(year, month, 1).strftime("%b"))

        # 3. Group events by job
        events_by_job = defaultdict(list)
        for r in event_rows:
            events_by_job[r["job_fk"]].append({
                "stage": r["stage"],
                "date": r["timestamp_utc"].date()
            })

        # 4. Assemble job timelines
        job_states = []
        for r in job_rows:
            job_id = r["id"]
            current_stage = r["app_stage"]
            received_at_ts = r["received_at_ts"]
            
            created_date = received_at_ts.date() if received_at_ts else None
            
            job_events = events_by_job.get(job_id, [])
            if job_events:
                first_event_date = job_events[0]["date"]
                if not created_date:
                    created_date = first_event_date
                elif first_event_date < created_date:
                    created_date = first_event_date
            
            job_states.append({
                "id": job_id,
                "current_stage": current_stage,
                "created_date": created_date,
                "events": job_events
            })

        # 5. Compute stage counts on each snapshot date
        stage_keys = ["applied", "interview", "offer", "accepted"]
        stage_map_db_to_key = {
            "Applied": "applied",
            "Interview": "interview",
            "Offer": "offer",
            "Accepted": "accepted",
        }

        stage_counts = {stage: [0] * 4 for stage in stage_keys}

        for idx, d in enumerate(snapshot_dates):
            for job in job_states:
                # If the job didn't exist yet on snapshot date 'd', skip it
                if not job["created_date"] or job["created_date"] > d:
                    continue
                
                # Find the latest event on or before snapshot date 'd'
                active_stage = None
                for ev in job["events"]:
                    if ev["date"] <= d:
                        active_stage = ev["stage"]
                    else:
                        break # events are sorted chronologically
                
                # Fallback to current_stage if no events recorded yet but job was created
                if not active_stage:
                    active_stage = job["current_stage"]
                
                # Map to stage key
                stage_key = stage_map_db_to_key.get(active_stage)
                if stage_key:
                    stage_counts[stage_key][idx] += 1

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
            detail="Error calculating monthly historical stage splits.",
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

    jobs_query = f"""
        SELECT 
            id, 
            app_stage,
            {RECEIVED_AT_TS_SQL} AS received_at_ts
        FROM public.job_applications
        WHERE user_uid = $1
          AND is_deleted = FALSE
          AND is_archived = FALSE;
    """

    events_query = """
        SELECT 
            job_fk,
            new_value AS stage,
            timestamp_utc
        FROM public.app_events
        WHERE user_uid = $1
          AND event_type IN ('processed', 'stage_change')
        ORDER BY timestamp_utc ASC, event_id ASC;
    """

    try:
        # 1. Fetch active jobs and events
        async with get_connection() as conn:
            job_rows = await conn.fetch(jobs_query, uid)
            event_rows = await conn.fetch(events_query, uid)

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

        # 2. Group events by job
        from collections import defaultdict
        events_by_job = defaultdict(list)
        for r in event_rows:
            events_by_job[r["job_fk"]].append({
                "stage": r["stage"],
                "date": r["timestamp_utc"].date()
            })

        # 3. Assemble job state timelines
        job_states = []
        for r in job_rows:
            job_id = r["id"]
            current_stage = r["app_stage"]
            received_at_ts = r["received_at_ts"]
            
            # Fallback creation date
            created_date = received_at_ts.date() if received_at_ts else None
            
            job_events = events_by_job.get(job_id, [])
            if job_events:
                first_event_date = job_events[0]["date"]
                if not created_date:
                    created_date = first_event_date
                elif first_event_date < created_date:
                    created_date = first_event_date
            
            job_states.append({
                "id": job_id,
                "current_stage": current_stage,
                "created_date": created_date,
                "events": job_events
            })

        # 4. Count active jobs in each stage for each of the 90 days
        stage_counts = {stage: [0] * 90 for stage in stage_keys}

        for day_idx, d in enumerate(days):
            for job in job_states:
                # If the job didn't exist yet, skip it
                if not job["created_date"] or job["created_date"] > d:
                    continue
                
                # Find the latest event on or before day 'd'
                active_stage = None
                for ev in job["events"]:
                    if ev["date"] <= d:
                        active_stage = ev["stage"]
                    else:
                        break # events are sorted by timestamp
                
                # Fallback to current_stage if no events recorded yet but job was created
                if not active_stage:
                    active_stage = job["current_stage"]
                
                # Map to stage key
                stage_key = stage_map_db_to_key.get(active_stage)
                if stage_key:
                    stage_counts[stage_key][day_idx] += 1

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

    query = f"""
        WITH normalized_applications AS (
            SELECT
                app_stage,
                {RECEIVED_AT_TS_SQL} AS received_at_ts
            FROM public.job_applications
            WHERE user_uid = $1
              AND is_deleted = FALSE
              AND is_archived = FALSE
        )
        SELECT
            COALESCE(avg_applied, 0.0)   AS applied,
            COALESCE(avg_interview, 0.0) AS interview,
            COALESCE(avg_offer, 0.0)     AS offer,
            COALESCE(avg_accepted, 0.0)  AS accepted
        FROM (
            SELECT
                AVG(
                    CASE WHEN app_stage = 'Applied'
                         THEN EXTRACT(EPOCH FROM (now() - received_at_ts)) / 86400.0
                    END
                ) AS avg_applied,
                AVG(
                    CASE WHEN app_stage = 'Interview'
                         THEN EXTRACT(EPOCH FROM (now() - received_at_ts)) / 86400.0
                    END
                ) AS avg_interview,
                AVG(
                    CASE WHEN app_stage = 'Offer'
                         THEN EXTRACT(EPOCH FROM (now() - received_at_ts)) / 86400.0
                    END
                ) AS avg_offer,
                AVG(
                    CASE WHEN app_stage = 'Accepted'
                         THEN EXTRACT(EPOCH FROM (now() - received_at_ts)) / 86400.0
                    END
                ) AS avg_accepted
            FROM normalized_applications
            WHERE received_at_ts IS NOT NULL
              AND received_at_ts >= now() - INTERVAL '90 days'
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
    summary="Get 12-week trend of average applications per week",
)
async def avg_apps_per_week(user: dict = Depends(get_current_user)):
    """
    Returns the last 12 weeks of application counts (per week) for the user.
    Weeks are based on the time the application was received (received_at),
    falling back to updated_at when needed.
    """
    uid = user.get("uid")
    logging.info(f"Fetching avg-apps-per-week for user {uid}")

    now = datetime.now(timezone.utc)

    query = f"""
        WITH normalized_applications AS (
            SELECT
                {RECEIVED_AT_TS_SQL} AS received_at_ts
            FROM public.job_applications
            WHERE user_uid = $1
              AND is_deleted = FALSE
              AND is_archived = FALSE
        )
        SELECT
            date_trunc('week', received_at_ts)::date AS week_start,
            COUNT(*)::int AS count
        FROM normalized_applications
        WHERE received_at_ts IS NOT NULL
        AND received_at_ts >= timezone('utc', now()) - INTERVAL '12 weeks'
        GROUP BY week_start
        ORDER BY week_start ASC;
    """

    try:
        async with get_connection() as conn:
            rows = await conn.fetch(query, uid)

        counts_by_week = {r["week_start"]: r["count"] for r in rows}

        today = now.date()
        current_week_start = today - timedelta(days=today.weekday())

        week_starts = [current_week_start - timedelta(weeks=11 - i) for i in range(12)]

        values = [counts_by_week.get(ws, 0) for ws in week_starts]
        labels = [
            f"WK {ws.isocalendar().week}" for ws in week_starts
        ]
        week_start_dates = [ws.isoformat() for ws in week_starts]
        return {
            "labels": labels,
            "week_start_dates": week_start_dates,
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
            weekly_query = f"""
            WITH normalized_applications AS (
                SELECT {RECEIVED_AT_TS_SQL} AS received_at_ts
                FROM public.job_applications
                WHERE user_uid = $1
                    AND is_deleted = FALSE
                    AND is_archived = FALSE
            )
            SELECT COUNT(*)::int AS apps
            FROM normalized_applications
            WHERE received_at_ts IS NOT NULL
                AND received_at_ts >= now() - INTERVAL '7 days';
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
            consistency_query = f"""
            WITH normalized_applications AS (
                SELECT {RECEIVED_AT_TS_SQL} AS received_at_ts
                FROM public.job_applications
                WHERE user_uid = $1
                    AND is_deleted = FALSE
                    AND is_archived = FALSE
            )
            SELECT COUNT(*)::int AS active_days
            FROM (
                SELECT received_at_ts::date AS day
                FROM normalized_applications
                WHERE received_at_ts IS NOT NULL
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

    query = f"""
        WITH normalized_applications AS (
            SELECT {RECEIVED_AT_TS_SQL} AS received_at_ts
            FROM public.job_applications
            WHERE user_uid = $1
              AND is_deleted = FALSE
              AND is_archived = FALSE
        )
        SELECT
            received_at_ts::date AS day,
            COUNT(*)::int AS app_count
        FROM normalized_applications
        WHERE received_at_ts IS NOT NULL
          AND received_at_ts >= timezone('utc', now()) - INTERVAL '84 days'
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
            full_data_dict[key] = {
                "v": count,
                "date": d.isoformat()
            }

        full_data = [
            {"x": week, "y": dow, "v": info["v"], "date": info["date"]}
            for (week, dow), info in full_data_dict.items()
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
