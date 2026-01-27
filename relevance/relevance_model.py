from transformers import DistilBertForSequenceClassification, DistilBertTokenizerFast
import torch
import pandas as pd
from common.logger import get_logger
logging = get_logger()

MODEL = None
TOKENIZER = None
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

def init_model(model_path: str):
    global MODEL, TOKENIZER
    try:
        MODEL = DistilBertForSequenceClassification.from_pretrained(model_path)
        TOKENIZER = DistilBertTokenizerFast.from_pretrained(model_path)
        MODEL.to(DEVICE) # type: ignore
        MODEL.eval()
        logging.info(f"Model loaded on {DEVICE} from {model_path}")
        
    except Exception as e:
        logging.error(f"Failed to load model from {model_path}: {e}")
        MODEL = None
        TOKENIZER = None
        raise


def predict(emails: pd.DataFrame, threshold: float = 0.1):
    if MODEL is None or TOKENIZER is None:
        raise RuntimeError("Model not initialized. Call init_model() first.")
    
    if 'body' not in emails.columns:
        raise ValueError("Input DataFrame must contain a 'body' column.")
    
    texts = emails['body'].fillna("").astype('string').tolist()
    texts = [text[:200] for text in texts]  # Truncate to 200 characters (like training)
    
    inputs = TOKENIZER(
        texts, padding=True, truncation=True, return_tensors="pt", max_length=200
    ).to(DEVICE)
    
    with torch.no_grad():
        logits = MODEL(**inputs).logits
        probs = torch.softmax(logits, dim=1)[:, 1].cpu()  
        
    del inputs, logits
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    
    new_df = emails.copy()
    new_df['job_probability'] = probs.tolist()
    new_df['prediction'] = (new_df['job_probability'] >= threshold).astype(int)
    new_df['job_probability'] = new_df['job_probability'].astype(float)
    return new_df
