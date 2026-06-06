from enum import Enum
from dataclasses import dataclass, field

class TaskType(Enum):
    INITIAL_SYNC = ("gmail.initial_sync", "gmail_initial_sync_queue")
    ENSURE_WATCH = ("gmail.ensure_watch", "gmail_initial_sync_queue")
    PROCESS_HISTORY_EVENT = ("gmail.process_history_event", "gmail_initial_sync_queue")
    CATCH_UP_SYNC = ("gmail.catch_up_sync", "gmail_initial_sync_queue")
    FETCH_CONTENT = ("gmail.fetch_content", "gmail_fetch_content_queue")
    CLASSIFICATION_MODEL = (
        "classification_model.classification_task",
        "classification_model_queue",
    )
    EMAIL_INFERENCE = (
        "classification_model.email_inference_task",
        "email_inference_queue",
    )
    REQUEUE_STALE_EMAIL_INFERENCE = (
        "classification_model.requeue_stale_email_inference_task",
        "classification_model_queue",
    )
    NER_MODEL = ("ner_model.ner_task", "ner_model_queue")

    def __init__(self, task_name: str, queue_name: str):
        self.task_name = task_name
        self.queue_name = queue_name


class EmailStatus(Enum):
    RETRY = "RETRY"
    PURGE = "PURGE"
    AWAIT_CLASSIFICATION = "AWAIT_CLASSIFICATION"
    FAILED_PERMANENTLY = "NOT_PROCESSABLE"
    AWAIT_TRANSFER = "AWAIT_TRANSFER"

class EmailStage(Enum):
    APPLIED = "Applied"
    INTERVIEW = "Interview"
    OFFER = "Offer"
    ACCEPTED = "Accepted"
    REJECTED = "Rejected"

@dataclass
class ClassificationModelResult:
    applied: list
    interview: list
    offer: list
    accepted: list
    rejected: list
    retry: list
    inference: list = field(default_factory=list)
    not_job_related: list = field(default_factory=list)
