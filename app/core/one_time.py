"""One-time verification codes and password-reset tokens.

Codes/tokens are generated from a CSPRNG, stored only as their SHA-256
digest, and compared with a timing-safe comparison. All expiry logic lives
in the auth routes.
"""

import hashlib
import hmac
import secrets


def generate_verify_code() -> str:
    """Return a fresh 6-digit numeric verification code."""
    return f"{secrets.randbelow(1_000_000):06d}"


def generate_reset_token() -> str:
    """Return a fresh URL-safe password reset token."""
    return secrets.token_urlsafe(32)


def hash_secret(value: str) -> str:
    """SHA-256 digest of a code/token (what actually gets stored)."""
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def verify_secret(value: str, stored_hash: str | None) -> bool:
    """Timing-safe check that ``value`` matches ``stored_hash``."""
    if not stored_hash:
        return False
    return hmac.compare_digest(hash_secret(value), stored_hash)