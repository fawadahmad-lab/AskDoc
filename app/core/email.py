"""Transactional email delivery (verification, welcome, password reset).

Uses Gmail SMTP via the configured sender account. Delivery is behind
``deliver`` so swapping to an API provider (Resend/Brevo/SES) later is a
single-module change.
"""

import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger(__name__)

_APP_NAME = "Docly"


def _sender() -> str:
    return settings.EMAIL_SENDER or settings.EMAIL_SMTP_USER


def _configured() -> bool:
    return bool(settings.EMAIL_SMTP_USER and settings.EMAIL_SMTP_PASSWORD)


def _deliver(to: str, subject: str, text: str, html: str | None = None) -> None:
    """Send a plaintext (+ optional HTML) email to ``to``.

    In development without SMTP credentials the message is written to the
    server log instead of being sent, so flows remain testable offline.
    """
    if not _configured():
        if settings.ENVIRONMENT != "production":
            logger.info(
                "\n📧 [DEV EMAIL — not sent] to=%s subject=%r\n%s",
                to,
                subject,
                text,
            )
            print(
                f"\n📧 [DEV EMAIL — not sent] to={to} subject={subject}\n"
                f"{'=' * 60}\n{text}\n{'=' * 60}\n"
            )
            return
        raise RuntimeError("SMTP is not configured but email sending was requested")

    msg = EmailMessage()
    msg["From"] = _sender()
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(text)
    if html:
        msg.add_alternative(html, subtype="html")

    with smtplib.SMTP(settings.EMAIL_SMTP_HOST, settings.EMAIL_SMTP_PORT) as server:
        if settings.EMAIL_SMTP_TLS:
            server.starttls()
        server.login(settings.EMAIL_SMTP_USER, settings.EMAIL_SMTP_PASSWORD)
        server.send_message(msg)

    logger.info("Email sent to %s (subject=%r)", to, subject)


def _html_wrap(body: str) -> str:
    return (
        "<div style='font-family:Arial,sans-serif;font-size:15px;"
        "line-height:1.5;color:#1f2328;max-width:560px;margin:0 auto;'>"
        f"<p style='font-size:18px;font-weight:600;margin:0 0 16px;'>{_APP_NAME}</p>"
        f"{body}</div>"
    )


def send_verification_code(to: str, username: str, code: str) -> None:
    """Email the 6-digit verification code for a new account."""
    subject = f"Your {_APP_NAME} verification code"
    text = (
        f"Hi {username},\n\n"
        f"Welcome to {_APP_NAME}! To activate your account, enter this "
        f"verification code:\n\n    {code}\n\n"
        f"It expires in {settings.VERIFY_CODE_TTL_MINUTES} minutes. "
        f"If you didn't create an account, you can ignore this email.\n"
    )
    html = _html_wrap(
        f"<p>Hi {username},</p>"
        "<p>Welcome! To activate your account, enter this code:</p>"
        f"<p style='font-size:24px;font-weight:700;letter-spacing:6px;"
        f"background:#f1f5f9;padding:12px 16px;border-radius:10px;"
        f"display:inline-block;'>{code}</p>"
        f"<p>It expires in {settings.VERIFY_CODE_TTL_MINUTES} minutes.</p>"
        "<p>If you didn't create an account, you can ignore this email.</p>"
    )
    _deliver(to, subject, text, html)


def send_welcome_email(to: str, username: str) -> None:
    """Email the user once their account is verified and activated."""
    subject = f"Welcome to {_APP_NAME}! Your account is active"
    text = (
        f"Hi {username},\n\n"
        f"Your {_APP_NAME} account is active. Upload a document and start "
        f"asking grounded questions with citations.\n\n"
        f"Thanks for joining!\nThe {_APP_NAME} team\n"
    )
    _deliver(to, subject, text)


def send_password_reset(to: str, username: str, reset_url: str) -> None:
    """Email a single-use password reset link."""
    subject = f"Reset your {_APP_NAME} password"
    text = (
        f"Hi {username},\n\n"
        f"We received a request to reset your {_APP_NAME} password. Open the "
        f"link below to choose a new one:\n\n    {reset_url}\n\n"
        f"This link expires in {settings.RESET_TOKEN_TTL_MINUTES} minutes and "
        f"can only be used once. If you didn't request this, you can safely "
        f"ignore this email.\n"
    )
    html = _html_wrap(
        f"<p>Hi {username},</p>"
        f"<p>Open the link below to choose a new password. It expires in "
        f"{settings.RESET_TOKEN_TTL_MINUTES} minutes and works once.</p>"
        f"<p><a href='{reset_url}' style='display:inline-block;padding:10px 18px;"
        f"background:#0284c7;color:#ffffff;text-decoration:none;border-radius:10px;'>"
        f"Reset password</a></p>"
        "<p>If you didn't request this, you can ignore this email.</p>"
    )
    _deliver(to, subject, text, html)