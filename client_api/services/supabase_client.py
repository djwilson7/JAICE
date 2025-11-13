import asyncio
from fastapi import HTTPException, status
import asyncpg
from asyncpg.exceptions import InvalidPasswordError, CannotConnectNowError
import os
from dotenv import load_dotenv
from common.logger import get_logger
from contextlib import asynccontextmanager

logging = get_logger()
# Set up logging for granular debug information

# Load environment variables to ensure we can access DATABASE_URL immediately
load_dotenv()
# Connection Pool Resource
db_pool = None

DATABASE_URL = os.getenv("CLIENT_DATABASE_URL")


async def connect_to_db(max_retries: int = 5, retry_delay: int = 5):
    # Initializes the asyncpg connection pool
    global db_pool
    attempt = 1
    # Ensure DATABASE_URL is set
    if not DATABASE_URL:
        logging.error("DATABASE_URL environment variable is not set.")
        raise ValueError("DATABASE_URL environment variable is not set for asyncpg.")

    logging.info("Attempting to connect to the database pool")
    while attempt <= max_retries:
        # Create a connection pool with a 5 second timeout
        try:
            # If we fail this connect, it will raise an exception below
            db_pool = await asyncpg.create_pool(
                DATABASE_URL, timeout=5, command_timeout=60, min_size=1, max_size=10
            )
            logging.info("Database connection pool established successfully.")
            return db_pool

        except (CannotConnectNowError, ConnectionRefusedError):
            logging.warning(
                f"Database connection attempt {attempt} failed. Retrying in {retry_delay} seconds..."
            )
            await asyncio.sleep(retry_delay)
            attempt += 1
            
        # PASSWORD Error -> It was either changed or not properly set up.
        except InvalidPasswordError:
            logging.error(
                "FATAL: Database connection failed. REASON: Invalid Password/Credentials."
            )
            raise

        # Every other exception will be caught here. Check console logs for clues as to why.
        except Exception as e:
            logging.error(
                f"FATAL: Unhandled error connecting to pool: {e}"
            )
            await asyncio.sleep(retry_delay)
            attempt += 1

    logging.error("FATAL: Max retries exceeded for database connection.")
    db_pool = None
    return None

@asynccontextmanager
async def get_connection():
    global db_pool
    if db_pool is None:
        logging.error("Database pool not initialized.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database pool not initialized.",
        )
    conn = await db_pool.acquire()
    try:
        logging.info("Acquired a database connection from the pool.")
        yield conn
    finally:
        logging.info("Releasing the database connection back to the pool.")
        await db_pool.release(conn)


async def close_db_connection():
    """Closes the database connection pool on application shutdown."""
    global db_pool
    if db_pool:
        logging.info("Closing database connection pool.")
        await db_pool.close()


# Health check for the database connection pool
async def check_db_pool_status():
    logging.info("Checking database connection pool status.")
    if db_pool is None:
        logging.error("Database pool not initialized (Startup failed).")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database pool not initialized (Startup failed).",
        )
    logging.info("Database pool is active.")
    return {"status": "ok", "detail": "DB Pool Active"}
