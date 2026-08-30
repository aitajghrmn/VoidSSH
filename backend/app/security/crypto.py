import base64
import hashlib

from cryptography.fernet import Fernet
from flask import current_app


def _get_fernet() -> Fernet:
    raw_key = current_app.config["ENCRYPTION_KEY"]
    derived_key = base64.urlsafe_b64encode(hashlib.sha256(raw_key.encode("utf-8")).digest())
    return Fernet(derived_key)


def encrypt_value(plain_text: str) -> str:
    return _get_fernet().encrypt(plain_text.encode("utf-8")).decode("utf-8")


def decrypt_value(cipher_text: str) -> str:
    return _get_fernet().decrypt(cipher_text.encode("utf-8")).decode("utf-8")
