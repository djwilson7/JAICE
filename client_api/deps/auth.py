from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from client_api.services.firebase_admin import verify_id_token

from common.logger import get_logger
logging = get_logger()

# Security scheme for HTTP Bearer authentication
bearer = HTTPBearer(auto_error=False)

# Dependency that verifies Firebase ID tokens on protected routes
async def get_current_user(creds: HTTPAuthorizationCredentials = Depends(bearer)):
    # If no credentials are provided, raise a 401 Unauthorized error
    if not creds:
        logging.info("No credentials provided")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
    try:
        # Verify the ID token using Firebase Admin SDK
        decoded = verify_id_token(creds.credentials)
        # Return decoded user information if verification is successful
        return decoded
    except Exception as e:
        # If verification fails, raise a 401 Unauthorized error
        logging.error(f"Token verification failed: {e}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid/expired token")

async def get_user_from_token_query(token: str):
    if not token:
        logging.info("No token provided")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
    try:
        decoded = verify_id_token(token)
        return decoded
    except Exception as e:
        logging.error(f"Token verification failed in query param: {e}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid/expired token")