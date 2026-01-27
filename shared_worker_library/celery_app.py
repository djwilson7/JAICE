import os
from celery import Celery
from kombu import Queue
from shared_worker_library.utils.task_definitions import TaskType

celery_app = Celery("Workers")
celery_app.conf.broker_url = os.getenv("CELERY_BROKER_URL_LOCAL") or os.getenv("CELERY_BROKER_URL_PROD") # type: ignore[attr-defined]

# auto-register queues
celery_app.conf.task_queues = [
    Queue(task.queue_name) for task in TaskType
]

# auto-register routes
celery_app.conf.task_routes = {
    task.task_name: {"queue": task.queue_name} for task in TaskType
}
