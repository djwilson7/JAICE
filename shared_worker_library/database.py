import os, threading
from typing import cast
from common.logger import get_logger
from psycopg_pool import ConnectionPool
from psycopg import Connection
from psycopg.rows import TupleRow
from contextlib import contextmanager

logging = get_logger()
_pool_lock = threading.Lock()

DATABASE_URL = os.getenv("WORKER_DATABASE_URL")
if DATABASE_URL is None:
    raise ValueError("WORKER_DATABASE_URL environment variable is not set")

pool = None


def get_pool() -> ConnectionPool[Connection[TupleRow]]:
    """
    Initializes and returns a process-specific connection pool.
    """
    global pool
    with _pool_lock:
        if pool is None:
            logging.info("INIT NEW DB POOL FOR PROCESS")
            pool = ConnectionPool[Connection[TupleRow]](
                conninfo= cast(str, DATABASE_URL),
                min_size=1,
                max_size=15,
                max_lifetime=300,
                max_idle=60,
            )
    return pool

@contextmanager
def get_connection():
    """
    Gets a connection from the process-specific pool.
    """
    process_pool = get_pool()
    conn = process_pool.getconn()
    try:
        conn.prepare_threshold = 0
        logging.debug("Acquired DB connection from pool")
        yield conn
    finally:
        logging.debug("Releasing DB connection back to pool")
        process_pool.putconn(conn)
