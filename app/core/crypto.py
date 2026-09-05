"""Symmetric encryption for third-party credentials stored at rest."""

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings


def _fernet() -> Fernet:
    return Fernet(settings.ENCRYPTION_KEY.encode("utf-8"))


def encrypt_secret(plaintext: str) -> str:
    """Encrypt a credential (e.g. a user's Groq API key) for DB storage."""
    return _fernet().encrypt(plaintext.encode("utf-8")).decode("utf-8")


def decrypt_secret(token: str) -> str:
    """Decrypt a credential previously produced by :func:`encrypt_secret`."""
    try:
        return _fernet().decrypt(token.encode("utf-8")).decode("utf-8")
    except InvalidToken:
        raise ValueError("Stored credential could not be decrypted")


def mask_secret(secret: str) -> str:
    """Mask a credential for display, keeping only the last 4 characters.

    Returns ``None``-like empty string when the secret is absent.
    """
    secret = (secret or "").strip()
    if not secret:
        return ""
    if len(secret) <= 4:
        return "••••"
    return f"••••••••{secret[-4:]}"