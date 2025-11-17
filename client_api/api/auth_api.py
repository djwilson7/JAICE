import json
import re
import uuid
import os, jwt, httpx
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, status, Body
from fastapi.responses import JSONResponse, RedirectResponse
from google_auth_oauthlib.flow import Flow
from pathlib import Path
from client_api.deps.auth import get_current_user, get_user_from_token_query
from common.security import encrypt_token, decrypt_token
from celery import Celery
from common.logger import get_logger
from client_api.utils.task_definitions import TaskType
from pydantic import BaseModel

logging = get_logger()

# Create a new router object
router = APIRouter()

celery_client = Celery("core_api_client")

# LOCAL VS PROD ENV IMPORT VARIABLES (TRY PROD FALLBACK TO LOCAL)
celery_client.conf.update(
    broker_url=str(os.getenv("CELERY_BROKER_URL_LOCAL") or os.getenv("CELERY_BROKER_URL_PROD"))
)

BASE_URL = os.getenv("VITE_API_BASE_URL_LOCAL") or os.getenv("VITE_API_BASE_URL_PROD")
FRONTEND_DASHBOARD_URL = os.getenv("FRONTEND_DASHBOARD_URL_LOCAL") or os.getenv("FRONTEND_DASHBOARD_URL_PROD")
CLIENT_SECRETS_FILE = os.getenv("CLIENT_SECRETS_LOCAL") or os.getenv("CLIENT_SECRETS_PROD")

# STANDARD ENV VARS (Doesn't care about local vs prod)
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM")
BACKGROUND_DURATION_DAYS = int(os.getenv("BACKGROUND_DURATION_DAYS", "365"))
SCOPES = os.getenv("PERMISSIONS_SCOPES", "[]").strip("[]").replace('"', "").split(",")
REDIRECT_URI = os.getenv("REDIRECT_URI", "/api/auth/google/callback")
GOOGLE_REVOKE_ENDPOINT = os.getenv("GOOGLE_REVOKE_ENDPOINT", "https://oauth2.googleapis.com/revoke")


@router.get("/consent", summary="Generates the Google OAuth2 consent screen URL.")
def get_oauth_consent_url(user: dict = Depends(get_user_from_token_query)):
    uid = user.get("uid")
    logging.info(f"Generating OAuth2 consent URL.")

    if not CLIENT_SECRETS_FILE:
        logging.error("FATAL: CLIENT_SECRETS environment variable is not set.")
        raise ValueError("CLIENT_SECRETS environment variable is not set.")
    CLIENT_CONFIG = json.loads(CLIENT_SECRETS_FILE)
    logging.info(f"Base URL: {BASE_URL}, Redirect URI: {REDIRECT_URI}")
    
    if not BASE_URL or not REDIRECT_URI:
        logging.error("FATAL: BASE_URL or REDIRECT_URI environment variable is not set.")
        raise ValueError("BASE_URL or REDIRECT_URI environment variable is not set.")
    
    redirect = BASE_URL + REDIRECT_URI
    logging.info(f"Redirect URI: {redirect}")
    flow = Flow.from_client_config(
        CLIENT_CONFIG, scopes=SCOPES, redirect_uri=redirect
    )

    auth_url, state = flow.authorization_url(access_type="offline", state=uid)
    logging.debug(f"OAuth2 consent URL generated")
    return RedirectResponse(auth_url)


@router.get("/google/callback", summary="Handles the OAuth 2.0 callback from Google.")
async def oauth_callback(request: Request, code: str, state: str):
    """
    Exchanges the authorization code for a refresh token and updates the user's
    record in the database.
    """
    uid = state
    logging.info(f"Received OAuth callback for user.")

    redis = request.app.state.redis
    raw_value = await redis.get(f"gmail_sync_window:{uid}")
    await redis.delete(f"gmail_sync_window:{uid}")

    logging.warning(f"Fetched gmail_sync_window from redis for user {uid}: {raw_value}")
    if not raw_value or str(raw_value).lower() == "none":
        days_to_sync = 14
    else:
        try:
            days_to_sync = int(raw_value)
        except (ValueError, TypeError):
            logging.warning(
                f"Invalid days_to_sync value '{raw_value}' for user {uid}; defaulting to 14"
            )
            days_to_sync = 14

    start_date = datetime.utcnow() - timedelta(days=days_to_sync)
    logging.info(
        f"Using {days_to_sync}-day sync window for user {uid} (start date: {start_date.isoformat()})"
    )
    if not CLIENT_SECRETS_FILE:
        logging.error("FATAL: CLIENT_SECRETS environment variable is not set.")
        raise ValueError("CLIENT_SECRETS environment variable is not set.")
    
    CLIENT_CONFIG = json.loads(CLIENT_SECRETS_FILE)
    
    if not BASE_URL or not REDIRECT_URI:
        logging.error("FATAL: BASE_URL or REDIRECT_URI environment variable is not set.")
        raise ValueError("BASE_URL or REDIRECT_URI environment variable is not set.")
    
    redirect = BASE_URL + REDIRECT_URI

    flow = Flow.from_client_config(
        CLIENT_CONFIG,
        scopes=SCOPES,
        redirect_uri=redirect
    )


    try:
        flow.fetch_token(code=code)
        credentials = flow.credentials
        refresh_token = credentials.refresh_token

        if not refresh_token:
            logging.error(
                f"Refresh token not received for user: {uid}. User may have denied offline access."
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Refresh token was not provided by Google. Please ensure you grant offline access.",
            )

    except Exception as e:
        logging.error(f"Error fetching token from Google for user {uid}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to exchange authorization code with Google.",
        )

    logging.info(
        f"Successfully received refresh token for user: {uid}. Updating database."
    )
    encrypted_refresh_token = encrypt_token(refresh_token)
    pool = request.app.state.pool

    try:
        async with pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE user_account 
                SET 
                    google_refresh_token = $1, 
                    gmail_connected = True,
                    gmail_connected_at = NOW()
                WHERE user_id = $2
                """,
                encrypted_refresh_token,
                uid,
            )
        logging.info(f"Database successfully updated for user: {uid}")
    except Exception as e:
        logging.error(f"DB WRITE ERROR during OAuth callback for user {uid}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error while storing refresh token.",
        )

    try:
        trace_id = str(uuid.uuid4())
        logging.info(
            f"Enqueuing initial Gmail inbox sync task for user: {uid} with trace ID: {trace_id}"
        )
        dispatch_initial_gmail_sync(uid, trace_id, start_date)
    except Exception as e:
        logging.error(f"Error dispatching initial Gmail sync for user {uid}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to enqueue initial Gmail sync task.",
        )
    if not FRONTEND_DASHBOARD_URL:
        logging.error("FATAL: FRONTEND_DASHBOARD_URL environment variable is not set.")
        raise ValueError("FRONTEND_DASHBOARD_URL environment variable is not set.")
    return RedirectResponse(FRONTEND_DASHBOARD_URL)


def mint_jwt(uid: str, exp: int | None = None) -> str:
    logging.info(f"Minting RLS JWT for user.")
    supabase_secret = os.getenv("SUPABASE_JWT_SECRET")

    if not supabase_secret:
        logging.error("SUPABASE_JWT_SECRET environment variable is not set.")
        raise ValueError(
            "SUPABASE_JWT_SECRET environment variable is not set. Cannot sign RLS token."
        )

    iat = datetime.now(timezone.utc)
    adj_iat = iat - timedelta(minutes=2)

    if exp is not None:
        expiration_time = iat + timedelta(minutes=exp)
        logging.debug(f"Frontend JWT created: {expiration_time.isoformat()}")
    else:
        expiration_time = iat + timedelta(days=BACKGROUND_DURATION_DAYS)
        logging.debug(f"Background JWT created: {expiration_time.isoformat()}")

    payload = {
        "sub": uid,
        "user_id": uid,
        "role": "authenticated",
        "iat": int(adj_iat.timestamp()),
        "exp": int(expiration_time.timestamp()),
    }
    try:
        return jwt.encode(payload, supabase_secret, algorithm=JWT_ALGORITHM)
    except Exception as e:
        logging.error(f"Error encoding JWT for user {uid}: {e}")
        raise


async def phase_2_store_and_respond(
    request: Request, user_data: dict, refresh_token: str, backend_jwt: str
) -> JSONResponse:
    logging.info(f"Storing RLS JWT and refresh token for user: {user_data.get('uid')}")
    pool = request.app.state.pool
    encrypted_refresh_token = encrypt_token(refresh_token)
    uid = user_data.get("uid")
    user_email = user_data.get("email")
    try:
        logging.debug("Acquiring a database connection from the pool...")
        async with pool.acquire() as conn:
            logging.debug("Database connection acquired.")
            await conn.execute(
                """
            INSERT INTO user_account (
                user_id, 
                user_email, 
                backend_rls_jwt
            )
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id) DO NOTHING
            """,
                uid,
                user_email,
                backend_jwt,
            )
            logging.info(
                f"Successfully stored RLS JWT and refresh token for user: {uid}"
            )
    except Exception as e:
        logging.error(f"DB WRITE ERROR during RLS setup: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error during RLS session setup.",
        )

    logging.info(f"RLS session established for user: {uid}")
    return JSONResponse(
        {"status": "Success", "message": "RLS session established.", "user_id": uid}
    )


@router.post(
    "/revoke-gmail-consent",
    status_code=status.HTTP_200_OK,
    summary="Revokes Gmail consent by removing the refresh token and updating consent status.",
)
async def revoke_gmail_consent(
    request: Request, user: dict = Depends(get_current_user)
):
    uid = user.get("uid")
    logging.info(f"Initiating Gmail consent revocation for user: {uid}")
    pool = request.app.state.pool

    encrypted_refresh_token = None
    try:
        async with pool.acquire() as conn:
            record = await conn.fetchrow(
                "SELECT google_refresh_token FROM user_account WHERE user_id = $1", uid
            )

        if record is None or not record["google_refresh_token"]:
            logging.warning(
                f"No refresh token found for user {uid}. Proceeding with database cleanup."
            )
            refresh_token_to_revoke = None
        else:
            encrypted_refresh_token = record["google_refresh_token"]
            refresh_token_to_revoke = decrypt_token(encrypted_refresh_token)

    except Exception as e:
        logging.error(f"DB READ ERROR during revocation for user {uid}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error while retrieving refresh token.",
        )

    if refresh_token_to_revoke:
        logging.debug(f"Calling Google revocation endpoint for user: {uid}")
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    GOOGLE_REVOKE_ENDPOINT,
                    data={"token": refresh_token_to_revoke},
                )

            if response.status_code == status.HTTP_200_OK:
                logging.info(
                    f"Successfully revoked token on Google's side for user: {uid}"
                )
            else:
                logging.error(
                    f"Google Revocation failed (Status: {response.status_code}) for user {uid}. "
                    f"Response: {response.text}"
                )
                pass

        except httpx.RequestError as e:
            logging.error(f"HTTPX error during Google revocation for user {uid}: {e}")
            pass
        except Exception as e:
            logging.error(
                f"An unexpected error occurred during Google revocation for user {uid}: {e}"
            )
            pass

    logging.info(f"Clearing local refresh token and resetting flags for user: {uid}")
    try:
        async with pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE user_account 
                SET 
                    google_refresh_token = NULL, 
                    gmail_connected = False,
                    gmail_connected_at = NULL
                WHERE user_id = $1
                """,
                uid,
            )
        logging.info(f"Database cleanup successful for user: {uid}")
    except Exception as e:
        logging.error(f"DB WRITE ERROR during revocation cleanup for user {uid}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error while cleaning up connection status.",
        )

    # Optional: Dispatch a task to stop any ongoing sync operations

    return JSONResponse(
        {"status": "success", "message": "Gmail consent successfully revoked."},
        status_code=status.HTTP_200_OK,
    )


@router.post(
    "/setup-user-db",
    status_code=status.HTTP_200_OK,
    summary="Checks if the user already has a database record.",
)
async def setup_user_db(request: Request, user: dict = Depends(get_current_user)):
    uid = user.get("uid", "")
    email = user.get("email", "")
    
    pool = request.app.state.pool
    logging.info(f"Checking database record for user: {uid}")
    # So in here we would also write in the users name as well .

    try:
        async with pool.acquire() as conn:
            record = await conn.fetchrow(
                "SELECT user_id FROM user_account WHERE user_id = $1", uid
            )

        if record:
            logging.info(f"User {uid} already exists in DB.")
            return {"status": "exists", "user_id": uid}

        DUMMY_REFRESH_TOKEN = "NO_GMAIL_TOKEN_GRANTED"

        jwt_token = mint_jwt(uid)
        # User does not exist — create record
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO user_account (user_id, user_email, backend_rls_jwt)
                VALUES ($1, $2, $3)
                """,
                uid,
                email,
                jwt_token,
            )
            logging.info(f"Created new record for user {uid}")
            return {"status": "created", "user_id": uid}

    except Exception as e:
        logging.error(f"DB error during user setup: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error while setting up user record.",
        )


class SetupRLSBody(BaseModel):
    daysToSync: int | None = 14


@router.post(
    "/setup-rls-session",
    status_code=status.HTTP_200_OK,
    summary="Fetches or mints RLS JWT if missing, ensuring user DB row is initialized.",
)
async def setup_rls_session(
    request: Request,
    user_data: dict = Depends(get_current_user),
    body: SetupRLSBody = Body(...),
):
    uid = user_data.get("uid", "")
    pool = request.app.state.pool
    days_to_sync = body.daysToSync or 3
    logging.info(f"Setting up RLS session for user: {uid}, days_to_sync={days_to_sync}")

    try:
        async with pool.acquire() as conn:
            record = await conn.fetchrow(
                "SELECT backend_rls_jwt FROM user_account WHERE user_id = $1", uid
            )

        # If record exists and JWT is already stored, use it
        if record and record["backend_rls_jwt"]:
            backend_jwt = record["backend_rls_jwt"]
            logging.info(f"Using existing RLS JWT for user: {uid}")
        else:
            logging.info(f"No RLS JWT found. Minting new one for user: {uid}")
            backend_jwt = mint_jwt(uid)
            async with pool.acquire() as conn:
                await conn.execute(
                    """
                    UPDATE user_account 
                    SET backend_rls_jwt = $1 
                    WHERE user_id = $2
                    """,
                    backend_jwt,
                    uid,
                )

        # Store sync window (you can adjust this part based on your infra)
        redis = request.app.state.redis
        await redis.set(f"gmail_sync_window:{uid}", days_to_sync, ex=30)

        logging.info(f"Stored Gmail sync window ({days_to_sync} days) for user {uid}")

        DUMMY_REFRESH_TOKEN = "NO_GMAIL_TOKEN_GRANTED"

        return await phase_2_store_and_respond(
            request,
            user_data,
            refresh_token=DUMMY_REFRESH_TOKEN,
            backend_jwt=backend_jwt,
        )

    except Exception as e:
        logging.error(f"Critical error during RLS setup for user {uid}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Critical system error during RLS setup",
        )


@router.post(
    "/setup-frontend-rls-session",
    summary="Sets up a short-lived RLS JWT for frontend use.",
)
async def setup_frontend_rls_session(user: dict = Depends(get_current_user)):
    uid = user.get("uid", "")
    try:
        rls_jwt = mint_jwt(uid, exp=30)  # 30-minute token for active session
        return {"status": "success", "rls_jwt": rls_jwt}
    except Exception as e:
        logging.error(f"Error minting RLS JWT for user {uid}: {e}")
        raise HTTPException(status_code=500, detail="Failed to mint RLS session token.")


@router.get(
    "/gmail-consent-status",
    summary="Gets the current user's gmail consent status from the database.",
)
async def is_gmail_consent_provided(
    request: Request, user: dict = Depends(get_current_user)
):
    uid = user.get("uid", "")
    pool = request.app.state.pool

    logging.info(f"Fetching gmail status for user: {uid}")

    try:
        async with pool.acquire() as conn:
            record = await conn.fetchrow(
                "SELECT gmail_connected FROM user_account WHERE user_id = $1", uid
            )

            if record is None:
                logging.error(
                    f"CRITICAL: User row not found for UID: {uid}. The initial setup may have failed."
                )
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User record not found. Please log out and log in again.",
                )
            is_connected = record["gmail_connected"]
            logging.info(f"Gmail connection status for user {uid}: {is_connected}")
            return {"isConnected": is_connected}

    except HTTPException as e:
        raise e
    except Exception as e:
        logging.error(f"DB READ ERROR for user {uid}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="A database error occurred while fetching user status.",
        )


# Protected endpoint to get current user info
# The path here is relative to the prefix in main.py
@router.get("/me")
def me(user=Depends(get_current_user)):
    # Get the current authenticated user's information
    return {"uid": user["uid"], "email": user.get("email")}


def dispatch_initial_gmail_sync(uid: str, trace_id: str, start_date: datetime):
    return celery_client.send_task(
        TaskType.GMAIL_INITIAL_SYNC.task_name,
        args=[uid, trace_id, start_date.isoformat()],
        queue=TaskType.GMAIL_INITIAL_SYNC.queue_name,
        headers={"trace_id": trace_id, "uid": uid},
    )
