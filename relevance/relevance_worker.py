from shared_worker_library.celery_app import celery_app
from relevance.relevance_tasks import * 
from relevance.relevance_model import init_model
import spacy
from common.logger import get_logger
logging = get_logger()

MODEL_LOADED = False
NLP_MODEL = None

@celery_app.on_after_configure.connect # type: ignore[attr-defined]
def load_model_on_worker_start(**_):
    logging.info("Loading relevance model on worker start")
    global MODEL_LOADED, NLP_MODEL
    if MODEL_LOADED:
        return
    
    logging.info("Loading Relevance and NER models...")
    try:
        init_model("relevance/model/relevance_v2")
        
        logging.info("Loading NER model spacy on CPU...")
        
        NLP_MODEL = spacy.load("en_core_web_lg")
        MODEL_LOADED = True
        logging.info("Relevance and NER models loaded successfully")
        
    except Exception as e:
        logging.error(f"Error loading Relevance or NER model: {e}")
        raise e
    
