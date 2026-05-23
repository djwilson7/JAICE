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
    global MODEL, TOKENIZER, CLASSIFIER

    if CLASSIFIER is not None:
        return

    logging.info(f"[CLASSIFIER] Loading model: {MODEL_NAME}")

    try:
        use_cuda = torch.cuda.is_available()
        device_str = "cuda" if use_cuda else "cpu"
        dtype = torch.float16 if use_cuda else torch.float32

        TOKENIZER = AutoTokenizer.from_pretrained(MODEL_NAME)

        MODEL = AutoModelForSequenceClassification.from_pretrained(
            MODEL_NAME,
            torch_dtype=dtype,
        ).to(device_str)
        MODEL.eval()

        # If somehow dtype is wrong on CPU, force it back.
        if device_str == "cpu" and next(MODEL.parameters()).dtype != torch.float32:
            MODEL = MODEL.float()

        CLASSIFIER = pipeline(
            "zero-shot-classification",
            model=MODEL,
            tokenizer=TOKENIZER,
            device=0 if use_cuda else -1,
        )

        logging.info(
            f"[CLASSIFIER] Loaded on {device_str} dtype={next(MODEL.parameters()).dtype}"
        )

        # Warm pass
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
    Classifies the provided email text into one of the predefined stages.

    Uses the pre-loaded zero-shot classification pipeline.

    Args:
        email_text: The full text content of the email to classify.
        threshold: (Unused in this function scope, but defined for API consistency).

    Returns:
        A dictionary containing:
        - stage: The top predicted label.
        - score: The confidence score for the top label.
        - second_stage: The second most likely label.
        - second_score: The confidence score for the second label.
        - raw: The raw model output.
        - stage_scores: A dictionary of all labels and their scores.
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
