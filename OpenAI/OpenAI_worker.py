from shared_worker_library.celery_app import celery_app
import spacy
from common.logger import get_logger
logging = get_logger()

OPENAI_LOADED = False

@celery_app.on_after_configure.connect # type: ignore[attr-defined]
def load_model_on_worker_start(**_):
    logging.info("Loading OPENAI model on worker start")
    global OPENAI_LOADED
    if OPENAI_LOADED:
        return
    
    logging.info("Loading OpenAI Worker...")
    try:
        
        logging.info("Loading OpenAI Worker...")
        
        OPENAI_LOADED = True
        logging.info("OpenAI Worker loaded successfully")
        
    except Exception as e:
        logging.error(f"Error loading OpenAI Worker: {e}")
        raise e
    
