from enum import Enum


class TaskType(Enum):
    GMAIL_INITIAL_SYNC = ("gmail.initial_sync", "gmail_initial_sync_queue")
    GMAIL_ENSURE_WATCH = ("gmail.ensure_watch", "gmail_initial_sync_queue")
    GMAIL_CATCH_UP_SYNC = ("gmail.catch_up_sync", "gmail_initial_sync_queue")

    def __init__(self, task_name: str, queue_name: str):
        self.task_name = task_name
        self.queue_name = queue_name
