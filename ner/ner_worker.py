from shared_worker_library.celery_app import celery_app
from ner.ner_tasks import * 
import spacy

NLP_MODEL = None

@celery_app.on_after_configure.connect # type: ignore[attr-defined]
def load_model_on_worker_start(**_):
    logging.info("Loading NER Spacy model on worker start")
    global NLP_MODEL
    if NLP_MODEL:
        return

    logging.info("Loading NER model...")

    try:
        NLP_MODEL = spacy.load("en_core_web_lg")
        logging.info("NER model loaded successfully")
        
    except Exception as e:
        logging.error(f"Error loading NER model: {e}")
        raise e
    