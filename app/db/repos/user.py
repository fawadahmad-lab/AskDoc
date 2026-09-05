"""Data-access functions for :class:`app.db.models.User`."""

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.crypto import decrypt_secret, encrypt_secret
from app.core.security import hash_password
from app.db import models


def get_user_by_email_or_username(
    db: Session, email: str, username: str
) -> models.User | None:
    return (
        db.query(models.User)
        .filter(
            or_(
                models.User.email == email,
                models.User.username == username,
            )
        )
        .first()
    )


def get_user_by_username(db: Session, username: str) -> models.User | None:
    return (
        db.query(models.User)
        .filter(models.User.username == username)
        .first()
    )


def get_user_by_email(db: Session, email: str) -> models.User | None:
    return db.query(models.User).filter(models.User.email == email).first()


def set_verify_code(
    db: Session,
    user: models.User,
    code_hash: str,
    expires_dt,
) -> None:
    """Store a fresh verification code (hash + expiry) for the user."""
    user.verify_code_hash = code_hash
    user.verify_code_expires = expires_dt
    user.reset_token_hash = None
    user.reset_token_expires = None
    db.commit()


def mark_email_verified(db: Session, user: models.User) -> None:
    """Mark the user's email verified and clear any outstanding code."""
    from sqlalchemy.sql import func

    user.email_verified_at = func.now()
    user.verify_code_hash = None
    user.verify_code_expires = None
    db.commit()


def clear_verify_code(db: Session, user: models.User) -> None:
    """Invalidate the user's outstanding verification code."""
    user.verify_code_hash = None
    user.verify_code_expires = None
    db.commit()


def set_reset_token(
    db: Session,
    user: models.User,
    token_hash: str,
    expires_dt,
) -> None:
    """Store a fresh password-reset token (hash + expiry) for the user."""
    user.reset_token_hash = token_hash
    user.reset_token_expires = expires_dt
    user.verify_code_hash = None
    user.verify_code_expires = None
    db.commit()


def clear_reset_token(db: Session, user: models.User) -> None:
    """Invalidate the user's password-reset token (single-use)."""
    user.reset_token_hash = None
    user.reset_token_expires = None
    db.commit()


def create_user(
    db: Session,
    email: str,
    username: str,
    password: str,
    groq_api_key: str,
) -> models.User:
    """Create a user with their encrypted Groq API key."""
    user = models.User(
        email=email,
        username=username,
        hashed_password=hash_password(password),
        groq_api_key_enc=encrypt_secret(groq_api_key),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_user_groq_key(db: Session, user: models.User) -> str | None:
    """Return the decrypted Groq API key for a user, or ``None``."""
    if not user.groq_api_key_enc:
        return None
    return decrypt_secret(user.groq_api_key_enc)


def update_user_groq_key(
    db: Session, user: models.User, new_groq_api_key: str
) -> None:
    """Replace a user's Groq API key (encrypted) and flush stale cached
    responses generated under the old key.
    """
    user.groq_api_key_enc = encrypt_secret(new_groq_api_key)
    db.commit()
    # Flush cached responses so answers are regenerated under the new key.
    try:
        from app.cache import delete_user_cached_responses
        delete_user_cached_responses(user.id)
    except Exception:
        pass