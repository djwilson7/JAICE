from cryptography.fernet import Fernet
import os
from common.logger import get_logger
from typing import Union

logging = get_logger()
FERNET_KEY = os.environ.get("FERNET_KEY")
if not FERNET_KEY:
    raise ValueError("FERNET_KEY environment variable is not set.")

try:
    f = Fernet(FERNET_KEY)
except Exception:
    f = None
    logging.error("Fernet key not loaded. Refresh tokens will not be encrypted.")


def encrypt_token(token: str) -> bytes:
    """Encrypts a string (e.g., Google Refresh Token) to bytes."""
    if not f:
        logging.error("Encryption is unavailable: Fernet Key is missing or invalid.")
        raise ValueError("Encryption is unavailable: Fernet Key is missing or invalid.")
    return f.encrypt(token.encode("utf-8"))


def decrypt_token(encrypted_token: Union[bytes, str, None]) -> str:
    """Decrypts bytes or base64 string back into a UTF-8 string."""
    if not f:
        logging.error("Decryption is unavailable: Fernet Key is missing or invalid.")
        raise ValueError("Decryption is unavailable: Fernet Key is missing or invalid.")

    if encrypted_token is None:
        raise ValueError("Encrypted token cannot be None.")

    if isinstance(encrypted_token, str):
        encrypted_token = encrypted_token.encode("utf-8")

    return f.decrypt(encrypted_token).decode("utf-8")
