from shared_worker_library.celery_app import celery_app
import classification.class_tasks
from celery.signals import worker_process_init
from classification.class_model import init_classification_model

# This loads the model into memory on worker init so tasks can use it immediately.
@worker_process_init.connect
def warm_classification_model(**_):
    init_classification_model()
