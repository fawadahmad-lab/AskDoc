"""Authentication routes."""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Form, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.ratelimit import rate_limit
from app.core.config import settings
from app.core.email import (
    send_password_reset,
    send_verification_code,
    send_welcome_email,
)
from app.core.groq_keys import verify_groq_key
from app.core.one_time import (
    generate_reset_token,
    generate_verify_code,
    hash_secret,
    verify_secret,
)
from app.core.security import hash_password, verify_password, create_access_token
from app.core.deps import get_current_user
from app.db.base import get_db
from app.db import models
from app.db.repos import user as user_repo
from app.schemas import (
    UserCreate,
    UserResponse,
    TokenResponse,
    GroqKeyUpdate,
    VerifyEmailRequest,
    ResendVerificationRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)

router = APIRouter(prefix="/auth", tags=["auth"])

_EMAIL_ALLOWED_DOMAINS = set(settings.ALLOWED_EMAIL_DOMAINS)


def _issue_verify_code(db: Session, user: models.User) -> None:
    """Generate, store (hashed) and email a fresh verification code."""
    code = generate_verify_code()
    expires = datetime.now(timezone.utc) + timedelta(
        minutes=settings.VERIFY_CODE_TTL_MINUTES
    )
    user_repo.set_verify_code(db, user, hash_secret(code), expires)
    send_verification_code(user.email, user.username, code)


def _assert_allowed_email_domain(email: str) -> None:
    domain = email.split("@")[-1].lower()
    if domain not in _EMAIL_ALLOWED_DOMAINS:
        raise HTTPException(
            status_code=400,
            detail=(
                "Only Google-backed mailboxes are accepted. Please sign up "
                "with a Google account email."
            ),
        )


@router.post("/signup", response_model=UserResponse, status_code=201)
def signup(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    _rate: None = Depends(rate_limit(
        "signup",
        limit=settings.SIGNUP_RATE_LIMIT,
        window_seconds=settings.SIGNUP_RATE_WINDOW_SECONDS,
    )),
):
    _assert_allowed_email_domain(user_data.email)

    existing_user = user_repo.get_user_by_email_or_username(
        db, user_data.email, user_data.username
    )

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="Email or username already registered",
        )

    if not verify_groq_key(user_data.groq_api_key):
        raise HTTPException(
            status_code=400,
            detail="The Groq API key is invalid. Double-check it at "
            "https://console.groq.com/keys and try again.",
        )

    user = user_repo.create_user(
        db,
        email=user_data.email,
        username=user_data.username,
        password=user_data.password,
        groq_api_key=user_data.groq_api_key,
    )

    _issue_verify_code(db, user)

    return user


@router.post("/verify-email", response_model=UserResponse)
def verify_email(
    verify_data: VerifyEmailRequest,
    db: Session = Depends(get_db),
    _rate: None = Depends(rate_limit(
        "verify",
        limit=settings.VERIFY_RATE_LIMIT,
        window_seconds=settings.VERIFY_RATE_WINDOW_SECONDS,
    )),
):
    user = user_repo.get_user_by_email(db, verify_data.email)

    # Generic failure on any mismatch to keep account discovery out of the API.
    if (
        user is None
        or user.verify_code_expires is None
        or user.verify_code_expires < datetime.now(timezone.utc)
    ):
        user_repo.clear_verify_code(db, user) if user else None
        raise HTTPException(
            status_code=400,
            detail="Verification code is invalid or expired.",
        )

    if not verify_secret(verify_data.code, user.verify_code_hash):
        raise HTTPException(
            status_code=400,
            detail="Verification code is invalid or expired.",
        )

    user_repo.mark_email_verified(db, user)

    send_welcome_email(user.email, user.username)

    return user


@router.post("/resend-verification")
def resend_verification(
    data: ResendVerificationRequest,
    db: Session = Depends(get_db),
    _rate: None = Depends(rate_limit(
        "resend",
        limit=settings.RESEND_RATE_LIMIT,
        window_seconds=settings.RESEND_RATE_WINDOW_SECONDS,
    )),
):
    user = user_repo.get_user_by_email(db, data.email)

    if user is not None and user.email_verified_at is None:
        _issue_verify_code(db, user)

    # Generic response: never reveal whether an email is registered.
    return {
        "detail": "If the account exists and is unverified, a new "
        "verification code was sent."
    }


@router.post("/forgot-password")
def forgot_password(
    data: ForgotPasswordRequest,
    db: Session = Depends(get_db),
    _rate: None = Depends(rate_limit(
        "forgot",
        limit=settings.FORGOT_RATE_LIMIT,
        window_seconds=settings.FORGOT_RATE_WINDOW_SECONDS,
    )),
):
    user = user_repo.get_user_by_email(db, data.email)

    if user is not None and user.email_verified_at is not None:
        token = generate_reset_token()
        expires = datetime.now(timezone.utc) + timedelta(
            minutes=settings.RESET_TOKEN_TTL_MINUTES
        )
        user_repo.set_reset_token(db, user, hash_secret(token), expires)

        reset_url = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password?token={token}"
        send_password_reset(user.email, user.username, reset_url)

    return {"detail": "If an account exists with that email, a reset link was sent."}


@router.post("/reset-password")
def reset_password(
    data: ResetPasswordRequest,
    db: Session = Depends(get_db),
    _rate: None = Depends(rate_limit(
        "reset",
        limit=settings.RESET_RATE_LIMIT,
        window_seconds=settings.RESET_RATE_WINDOW_SECONDS,
    )),
):
    token_hash = hash_secret(data.token)
    user = (
        db.query(models.User)
        .filter(models.User.reset_token_hash == token_hash)
        .first()
    )

    if (
        user is None
        or user.reset_token_expires is None
        or user.reset_token_expires < datetime.now(timezone.utc)
    ):
        raise HTTPException(
            status_code=400,
            detail="Reset link is invalid or expired.",
        )

    user.hashed_password = hash_password(data.new_password)
    user_repo.clear_reset_token(db, user)

    return {"detail": "Password updated. You can sign in now."}


@router.post("/login", response_model=TokenResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    remember_me: str = Form("false"),
    db: Session = Depends(get_db),
    _rate: None = Depends(rate_limit(
        "login",
        limit=settings.LOGIN_RATE_LIMIT,
        window_seconds=settings.LOGIN_RATE_WINDOW_SECONDS,
    )),
):
    user = user_repo.get_user_by_username(db, form_data.username)

    if user is None or not verify_password(
        form_data.password,
        user.hashed_password,
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password",
        )

    if user.email_verified_at is None:
        raise HTTPException(
            status_code=403,
            detail="Email not verified. Enter the 6-digit code from your inbox.",
        )

    # "Remember me" issues a long-lived session token (token expiry + cookie
    # maxAge are set together by the BFF).
    expires_delta = (
        timedelta(days=settings.REMEMBER_ME_DAYS)
        if remember_me.lower() in ("true", "on", "1", "yes")
        else None
    )
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=expires_delta
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


@router.get("/me", response_model=UserResponse)
def get_me(
    current_user: models.User = Depends(get_current_user),
):
    """Return the currently authenticated user."""
    return current_user


@router.put("/me/groq-api-key", response_model=UserResponse)
def update_groq_api_key(
    key_data: GroqKeyUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Replace the current user's Groq API key (after live verification).

    The stored key is encrypted and existing cached responses are flushed so
    future answers use the new key.
    """
    if not verify_groq_key(key_data.groq_api_key):
        raise HTTPException(
            status_code=400,
            detail="The Groq API key is invalid. Double-check it at "
            "https://console.groq.com/keys and try again.",
        )

    user_repo.update_user_groq_key(
        db,
        current_user,
        key_data.groq_api_key,
    )

    db.refresh(current_user)
    return current_user