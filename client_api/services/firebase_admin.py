import os, json
import firebase_admin
from firebase_admin import credentials, auth
from dotenv import load_dotenv
import asyncio

from common.logger import get_logger
logging = get_logger()

# Still load the env but shift it into a function
# Integrating the DB required setting main up to manage both firebase auth and supabase.
# That means this file needed updated so that it could be imported and used in main.py
# Instead of running on import, we now lazy load and initialize when called from main.py
# This allows us to auth the user and ensure we have the UUID prior to accessing the DB.
# The db has row level security and any call will fail if the user is not authenticated, it also isolated the data to each user.

# Load environment variables from the backend .env file
load_dotenv()

def get_auth():
    return auth

def initialize_firebase_sdk():
    logging.info("Initializing Firebase Admin SDK...")
    sa_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

    try:
        firebase_admin.get_app()
        logging.warning("Firebase Admin SDK is already initialized early exit triggered.")
        # Early exit if already initialized
        return
    except ValueError:
        # Not initialized yet, proceed with initialization
        pass

    logging.info("Loading Firebase credentials from GOOGLE_APPLICATION_CREDENTIALS.")
    if sa_path and os.path.exists(sa_path):
        # Load credentials from the specified file path
        cred = credentials.Certificate(sa_path)
    else:
        logging.warning("GOOGLE_APPLICATION_CREDENTIALS not set or file does not exist using FIREBASE_SERVICE_ACCOUNT instead.")
        # Optionally load credentials from an environment variable
        sa_json = os.getenv("FIREBASE_SERVICE_ACCOUNT")
        if not sa_json:
            # Reraise a proper exception so the FastAPI startup fails cleanly
            logging.error("FIREBASE_SERVICE_ACCOUNT or GOOGLE_APPLICATION_CREDENTIALS not configured.")
            raise RuntimeError("FIREBASE_SERVICE_ACCOUNT or GOOGLE_APPLICATION_CREDENTIALS not configured.")
        try:
            cred = credentials.Certificate(json.loads(sa_json))
        except json.JSONDecodeError as e:
            logging.error(f"Failed to parse FIREBASE_SERVICE_ACCOUNT JSON: {e}")
            raise RuntimeError(f"Failed to parse FIREBASE_SERVICE_ACCOUNT JSON: {e}")

    # Final initialization
    firebase_admin.initialize_app(cred)
    logging.info("Firebase Admin SDK initialized successfully.")

# Function to verify Firebase ID tokens    
def verify_id_token(id_token: str):
    logging.info("Verifying Firebase ID token.")
    return auth.verify_id_token(id_token)

# Health check for Firebase Auth connectivity
async def check_firebase_auth_health():
    logging.info("Performing Firebase Auth health check.")
    if not firebase_admin._apps:
        # If the SDK wasn't initialized, we fail immediately.
        logging.error("Firebase SDK not initialized.")
        raise RuntimeError("Firebase SDK not initialized.")
    try:
        # Try a simple operation to confirm connectivity to the Firebase API.
        await asyncio.to_thread(auth.get_user, uid='non-existent-user-check-id')
    except firebase_admin.exceptions.NotFoundError:
        # This is the expected outcome, meaning we reached Firebase successfully.
        logging.info("Firebase Auth Health Check PASSED.")
        return True
    
    except Exception as e:
        # Any other exception indicates a problem with connectivity or SDK setup.
        logging.error(f"Firebase Auth Health Check FAILED: {e}")
        return False
    # If a user for the uid "non-existent-user-check-id" somehow exists, that's unexpected but still means connectivity is fine.
    logging.warning("Health check passed, but user was found for arbitrary uid 'non-existent-user-check-id'.")
    return True 