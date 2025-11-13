from shared_worker_library.database import get_connection
from common.logger import get_logger
from typing import List, Tuple

logging = get_logger()


def execute_transfer_query(
    trace_id: str,
    query: str,
    values: List[Tuple] = [],
    commit: bool = True,
) -> dict:
    logging.info(f"[{trace_id}] Executing transfer query")

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                rows_affected = 0

                if not values:
                    cur.execute(query, prepare=False) # type: ignore[arg-type]
                    rows_affected += cur.rowcount
                else:
                    for params in values:
                        cur.execute(query, params, prepare=False) # type: ignore[arg-type]
                        rows_affected += cur.rowcount

                if commit:
                    conn.commit()

        logging.info(
            f"[{trace_id}] Query executed successfully ({rows_affected} rows)."
        )
        return {"status": "success", "rows_affected": rows_affected}

    except Exception as e:
        logging.error(f"[{trace_id}] Error executing transfer query: {e}")
        return {"status": "failure", "error": str(e)}
