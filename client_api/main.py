from typing import Optional
from fastapi import FastAPI, HTTPException, status, Header
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from client_api.services.firebase_admin import initialize_firebase_sdk, check_firebase_auth_health
from client_api.api.auth_api import router as auth_router
from client_api.api.jobs import router as job_router
from client_api.services.supabase_client import check_db_pool_status, connect_to_db, close_db_connection
import httpx
import redis.asyncio as redis
import os
from dotenv import load_dotenv
load_dotenv()  # Load environment variables from .env file
from common.logger import get_logger
logging = get_logger()

# Application instance with lifespan management
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Handles application startup (before 'yield') and shutdown (after 'yield') events.
    
    # STARTUP LOGIC (Runs on application start)
    logging.info("Starting up the application...")
    
    # Initialize Firebase Admin SDK
    try:
        initialize_firebase_sdk()
        logging.info("Firebase SDK initialized.")
    except Exception as e:
        logging.error(f"FATAL: Firebase SDK initialization failed: {e}")
        raise
    
    # Initialize and store the database connection pool in app state
    try:
        app.state.pool = await connect_to_db() # returns the pool instance
        logging.info("Database connection pool created and assigned to app.state.")
    except Exception as e:
        logging.error(f"Fatal: Database connection failed: {e}")
        raise

    try:
        broker_url = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
        app.state.redis = redis.from_url(broker_url, decode_responses=True)
        logging.info(f"Redis client connected at {broker_url}")
    except Exception as e:
        logging.error(f"FATAL: Redis connection failed: {e}")
        raise
    
    # The application starts serving requests here
    yield 

    if app.state.pool:
        await close_db_connection()
        logging.info("Database connection pool closed.")
    # Runs when the application stops
    # Close the database connection pool gracefully
    logging.info("Application shutdown complete.")

# Create the FastAPI application instance with lifespan management
app = FastAPI(lifespan=lifespan)

# Allow the frontend to access the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*", "Authorization", "Content-Type"],
)

# Use the imported router instance
# All routes will get listed here for the backend services
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(job_router, prefix="/api/jobs", tags=['Jobs'])

# gmail API endpoints
@app.get("/gmail/messages", tags=["Gmail"], summary="Get Gmail Messages")
async def get_gmail_messages(
    max_results: int = 10, # how many emails to fetch
    authorization: Optional[str] = Header(None) # extract Authorization header
):
    """Fetch Gmail messages from the users inbox."""
    if not authorization or not authorization.startswith("Bearer "):
        logging.error("No valid authorization header provided")
        raise HTTPException(status_code=401, detail="No valid Authorization header provided.")

    access_token = authorization.replace("Bearer ", "")
    logging.info(f"Access token received.")

    try:
        logging.info("Beginning to fetch Gmail messages..")
        async with httpx.AsyncClient() as client:
            # Make the request to Gmail API to get messages
            response = await client.get(
                "https://www.googleapis.com/gmail/v1/users/me/messages",
                headers={"Authorization": f"Bearer {access_token}"},
                params={"maxResults": max_results}
            )
            logging.info(f"Response received from Gmail API: {response.status_code}")
            # handle errors
            if response.status_code != 200:
                logging.error(f"Gmail API error: {response.status_code} - {response.text}")
                raise HTTPException(status_code=response.status_code, detail="Failed to fetch Gmail messages.")
            
            logging.info("Gmail messages fetched successfully.")
            return response.json()
        
    except httpx.HTTPError as e:
        logging.error(f"Error fetching Gmail messages: {e}")
        raise HTTPException(status_code=500, detail="Internal server error while fetching Gmail messages.")
    
@app.get("/gmail/messages/{message_id}", tags=["Gmail"], summary="Get Gmail Message by ID")
async def get_gmail_message(
    message_id: str,
    authorization: Optional[str] = Header(None) # extract Authorization header
):
    """Fetch a specific Gmail message by its ID."""
    if not authorization or  not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No valid Authorization header provided.")
    
    access_token = authorization.replace("Bearer ", "")

    # Fetch the specific message from Gmail API
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://www.googleapis.com/gmail/v1/users/me/messages/{message_id}",
                headers={"Authorization": f"Bearer {access_token}"},
            )

            # handle errors
            if response.status_code != 200:
                logging.error(f"Gmail API error: {response.status_code} - {response.text}")
                raise HTTPException(status_code=response.status_code, detail="Failed to fetch Gmail message.")
            
            logging.info(f"Gmail message {message_id} fetched successfully.")
            return response.json()
        
    except httpx.HTTPError as e:
        logging.error(f"Error fetching Gmail message {message_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error while fetching Gmail message.")


# Sanity Checks and Health Endpoints
# --------------------------------------------
# Simple liveness check endpoint
def check_app_liveness():
    logging.info("Liveness check requested.")
    return {"status": "ok", "detail": "Application process is running"}

# Simple health check endpoint
@app.get("/health/alive", tags=["Health Checks"], summary="Is FastAPI Alive?")
def alive_check():
    """Confirms the FastAPI process is responsive (Liveness Probe)."""
    return JSONResponse(content=check_app_liveness(), status_code=status.HTTP_200_OK) 

@app.get("/health/db_alive", tags=["Health Checks"], summary="Is Database Alive?")
async def db_alive_check():
    """Confirms the database connection pool is initialized and available."""
    try:
        result = await check_db_pool_status()
        return JSONResponse(content=result, status_code=status.HTTP_200_OK)
    except HTTPException as exc:
        # Return the 503 status if the pool is not initialized
        return JSONResponse(content=exc.detail, status_code=exc.status_code)

# --- Authentication Service Liveness Check ---
@app.get("/health/auth_alive", tags=["Health Checks"], summary="Is Firebase Auth Alive?")
async def auth_alive_check():
    """Confirms that Firebase Auth service is reachable via HTTP."""
    try:
        result = await check_firebase_auth_health()
        return JSONResponse(content=result, status_code=status.HTTP_200_OK)
    except HTTPException as exc:
        # Return the 503 status if the Auth service is unreachable/failing
        return JSONResponse(content=exc.detail, status_code=exc.status_code)