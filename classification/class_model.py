from transformers import AutoTokenizer, AutoModelForSequenceClassification, pipeline
from classification.model_config import (
    CLASSIFICATION_LABELS,
    CONFIDENCE_THRESHOLD,
)
from collections.abc import Iterator
from common.logger import get_logger
import torch

logging = get_logger()

MODEL = None
TOKENIZER = None
CLASSIFIER = None

MODEL_NAME = "MoritzLaurer/deberta-v3-large-zeroshot-v2.0"
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Prepare candidate labels & reverse lookup (unchanged)
CANDIDATE_LABELS = list(CLASSIFICATION_LABELS.values())
VALUE_TO_KEY = {v: k for k, v in CLASSIFICATION_LABELS.items()}
HYPOTHESIS_TEMPLATE = "This email is a {}."


def init_classification_model():
    """
    Loads and warms the zero-shot classification model ONCE per worker.
    This replaces lazy-loading inside classify_email_stage().
    """
    global MODEL, TOKENIZER, CLASSIFIER

    if CLASSIFIER is not None:
        return  # already initialized

    logging.info(f"[CLASSIFIER] Loading model: {MODEL_NAME}")

    try:
        MODEL = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)
        TOKENIZER = AutoTokenizer.from_pretrained(MODEL_NAME)

        MODEL.to(DEVICE)  # type: ignore
        MODEL.eval()

        CLASSIFIER = pipeline(
            "zero-shot-classification",
            model=MODEL,
            tokenizer=TOKENIZER,
            device=0 if torch.cuda.is_available() else -1,
        )

        logging.info("[CLASSIFIER] Model loaded successfully.")

        # Warm pass (loads weights fully into CPU/GPU memory)
        CLASSIFIER(
            "Warmup text.",
            candidate_labels=["warm", "cold"],
            hypothesis_template=HYPOTHESIS_TEMPLATE,
            multi_label=False,
        )

        logging.info("[CLASSIFIER] Warmup complete.")

    except Exception as e:
        logging.error(f"[CLASSIFIER] Failed to load: {e}")
        MODEL = None
        TOKENIZER = None
        CLASSIFIER = None
        raise


def get_classifier():
    if CLASSIFIER is None:
        raise RuntimeError(
            "Classification model not initialized. Call init_classification_model() first."
        )
    return CLASSIFIER


def classify_email_stage(email_text: str, threshold: float = CONFIDENCE_THRESHOLD):
    """
    ORIGINAL prediction implementation.
    Only difference: now uses warm-loaded classifier instead of lazy init.
    """

    classifier = get_classifier()

    raw_result = classifier(
        email_text,
        candidate_labels=CANDIDATE_LABELS,
        hypothesis_template=HYPOTHESIS_TEMPLATE,
        multi_label=False,
    )

    # Normalize weird HF pipeline output cases (iterator, dict, list)
    if isinstance(raw_result, dict):
        result = raw_result
    elif isinstance(raw_result, Iterator):
        result = next(raw_result)
    elif isinstance(raw_result, list):
        result = raw_result[0]
    else:
        raise TypeError(f"Unexpected classifier output type: {type(raw_result)}")

    # Build label-score mapping (unchanged)
    label_scores = {
        lab: score for lab, score in zip(result["labels"], result["scores"])
    }

    # Map back to internal keys
    stage_scores = {
        VALUE_TO_KEY.get(desc, desc): float(score)
        for desc, score in label_scores.items()
    }

    # Sort stages
    sorted_stages = sorted(stage_scores.items(), key=lambda kv: kv[1], reverse=True)

    top_label, top_score = (
        (sorted_stages[0][0], sorted_stages[0][1]) if sorted_stages else (None, 0)
    )

    if len(sorted_stages) > 1:
        second_label, second_score = (
            sorted_stages[1][0],
            sorted_stages[1][1],
        )
    else:
        second_label, second_score = (None, 0)

    return {
        "stage": top_label,
        "score": float(top_score),
        "second_stage": second_label,
        "second_score": float(second_score),
        "raw": result,
        "stage_scores": stage_scores,
    }
