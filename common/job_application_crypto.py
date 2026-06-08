import base64
import os
from functools import lru_cache
from typing import Any, Dict, List, Mapping, Optional

from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF


JOB_APPLICATION_ENCRYPTED_FIELDS = {
    "title": "title_enc",
    "company_name": "company_name_enc",
    "description": "description_enc",
    "recruiter_name": "recruiter_name_enc",
    "recruiter_email": "recruiter_email_enc",
    "note": "note_enc",
}


@lru_cache(maxsize=1)
def _job_application_fernet() -> Fernet:
    root_key = os.getenv("FERNET_KEY")
    if not root_key:
        raise ValueError("FERNET_KEY environment variable is not set.")

    try:
        key_material = base64.urlsafe_b64decode(root_key)
    except Exception as exc:
        raise ValueError("FERNET_KEY is not valid URL-safe base64.") from exc

    derived_key = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=None,
        info=b"jaice/job-applications/v1",
    ).derive(key_material)
    return Fernet(base64.urlsafe_b64encode(derived_key))


def encrypt_job_application_value(value: Any) -> Optional[bytes]:
    if value is None:
        return None
    return _job_application_fernet().encrypt(str(value).encode("utf-8"))


def decrypt_job_application_value(value: Any) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, memoryview):
        value = bytes(value)
    if isinstance(value, str) and value.startswith("\\x"):
        value = bytes.fromhex(value[2:])
    return _job_application_fernet().decrypt(value).decode("utf-8")


def serialize_job_application(row: Mapping[str, Any]) -> Dict[str, Any]:
    serialized = dict(row)
    for field, encrypted_column in JOB_APPLICATION_ENCRYPTED_FIELDS.items():
        if encrypted_column not in serialized:
            continue
        serialized[field] = decrypt_job_application_value(
            serialized.pop(encrypted_column)
        )
    return serialized


def serialize_job_applications(
    rows: List[Mapping[str, Any]],
) -> List[Dict[str, Any]]:
    return [serialize_job_application(row) for row in rows]
