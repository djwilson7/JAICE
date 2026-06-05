import base64
import json
import os
import time
import uuid
from typing import Union

from celery import Celery
from google.cloud import pubsub_v1

from common.logger import get_logger
from shared_worker_library.utils.task_definitions import TaskType

logging = get_logger()
MISSING_CONFIG_SLEEP_SECONDS = 3600


class InvalidPubSubPayload(ValueError):
    pass


def decode_gmail_pubsub_data(data: Union[bytes, str]) -> dict:
    raw = data.encode("utf-8") if isinstance(data, str) else data
    try:
        return json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        try:
            padded = raw + b"=" * (-len(raw) % 4)
            decoded = base64.urlsafe_b64decode(padded)
            return json.loads(decoded.decode("utf-8"))
        except Exception as e:
            raise InvalidPubSubPayload("Pub/Sub message data is not raw JSON or base64url JSON.") from e


def subscription_path() -> str:
    project_id = os.getenv("GMAIL_PUBSUB_PROJECT_ID")
    subscription = (
        os.getenv("GMAIL_PUBSUB_SUBSCRIPTION")
        or os.getenv("GMAIL_PUBSUB_SUBSCRIPTION_NAME")
    )
    if not project_id:
        raise ValueError("GMAIL_PUBSUB_PROJECT_ID environment variable is not set.")
    if not subscription:
        raise ValueError("GMAIL_PUBSUB_SUBSCRIPTION_NAME environment variable is not set.")
    if subscription.startswith("projects/"):
        return subscription
    return f"projects/{project_id}/subscriptions/{subscription}"


def build_celery_client() -> Celery:
    celery_client = Celery("gmail_pubsub_listener")
    celery_client.conf.update(
        broker_url=str(
            os.getenv("CELERY_BROKER_URL_LOCAL") or os.getenv("CELERY_BROKER_URL_PROD")
        )
    )
    return celery_client


def validate_google_credentials_file() -> None:
    credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if not credentials_path:
        raise ValueError("GOOGLE_APPLICATION_CREDENTIALS environment variable is not set.")
    if not os.path.exists(credentials_path):
        raise ValueError(
            f"GOOGLE_APPLICATION_CREDENTIALS file does not exist: {credentials_path}"
        )
    if os.path.isdir(credentials_path):
        raise ValueError(
            f"GOOGLE_APPLICATION_CREDENTIALS points to a directory, not a JSON file: {credentials_path}"
        )


def dispatch_pubsub_event(celery_client: Celery, pubsub_message_id: str, payload: dict):
    email_address = payload.get("emailAddress")
    history_id = payload.get("historyId")
    if not email_address or not history_id:
        raise ValueError("Gmail Pub/Sub payload missing emailAddress or historyId.")

    trace_id = str(uuid.uuid4())
    return celery_client.send_task(
        TaskType.PROCESS_HISTORY_EVENT.task_name,
        args=[pubsub_message_id, email_address, str(history_id), trace_id],
        queue=TaskType.PROCESS_HISTORY_EVENT.queue_name,
        headers={"trace_id": trace_id, "email_address": email_address},
    )


def main() -> None:
    try:
        sub_path = subscription_path()
        validate_google_credentials_file()
        celery_client = build_celery_client()
        subscriber = pubsub_v1.SubscriberClient()
    except Exception as e:
        logging.warning(
            "Gmail Pub/Sub listener is disabled until Google Cloud Pub/Sub is configured: %s",
            e,
        )
        while True:
            time.sleep(MISSING_CONFIG_SLEEP_SECONDS)

    def callback(message: pubsub_v1.subscriber.message.Message) -> None:
        try:
            payload = decode_gmail_pubsub_data(message.data)
            dispatch_pubsub_event(celery_client, message.message_id, payload)
            message.ack()
            logging.info(
                f"Acknowledged Gmail Pub/Sub message {message.message_id} for {payload.get('emailAddress')}"
            )
        except InvalidPubSubPayload as e:
            logging.error(
                f"Dropping malformed Gmail Pub/Sub message {message.message_id}: {e}"
            )
            message.ack()
        except Exception as e:
            logging.error(
                f"Failed to process Gmail Pub/Sub message {message.message_id}: {e}"
            )
            message.nack()

    logging.info(f"Listening for Gmail Pub/Sub messages on {sub_path}")
    future = subscriber.subscribe(sub_path, callback=callback)
    try:
        future.result()
    finally:
        future.cancel()
        subscriber.close()


if __name__ == "__main__":
    main()
