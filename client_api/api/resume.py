from fastapi import APIRouter, File, UploadFile, HTTPException
from common.logger import get_logger
from typing import Any

# router = APIRouter(
#     prefix="/api/resume",   # 👈 add this
#     tags=["resume"],
# )

router = APIRouter(tags=["resume"])
logging = get_logger()


@router.post("/upload", summary="Upload a resume PDF and receive AI feedback")
async def upload_resume(file: UploadFile = File(...)) -> Any:
    """Accepts a PDF file upload and returns resume evaluation from OpenAI."""
    if not file.filename.lower().endswith(".pdf") and file.content_type != "application/pdf":
        logging.error("Uploaded file is not a PDF")
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    contents = await file.read()

    try:
        # Import here to avoid importing OpenAI in module import time if not used
        from OpenAI.OpenAI_model import evaluate_resume_pdf

        result = evaluate_resume_pdf(contents)
        return result
    except Exception as e:
        logging.error("Error evaluating resume", exc_info=True)
        # ⚠️ DEV-ONLY: expose the error so we can see it
        raise HTTPException(status_code=500, detail=f"Failed to evaluate resume: {e}")
