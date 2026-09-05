"""Application configuration loaded from the environment."""

import os

from dotenv import load_dotenv
from typing import Optional

# Capture the raw OS env value for vars that should remain overridable from
# the shell even though load_dotenv(override=True) would otherwise clobber it
# with the .env value. Read before load_dotenv so `MAX_EVALUATION_SAMPLES=4
# python -m ...` takes precedence, while .env still supplies the fallback.
_EXTERNAL_MAX_SAMPLES = os.getenv("MAX_EVALUATION_SAMPLES")

load_dotenv(override=True)


class Settings:
    """Centralised runtime configuration.

    Every secret / endpoint / model identifier is read here once so the rest
    of the application never pokes at ``os.environ`` directly.
    """

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")

    # Redis cache
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # Auth / JWT
    # Never ship a hardcoded default: "change-me" is publicly known and would
    # allow JWT forgery if a deployment forgets to set it. Enforced below.
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # CORS: comma-separated list of allowed browser origins (e.g. Vercel
    # frontend https://your-app.vercel.app). Empty list disallows cross-origin
    # browsers entirely. This is NOT "*" so credentials can be allowed safely.
    CORS_ORIGINS: list[str] = [
        o.strip()
        for o in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
        if o.strip()
    ]

    # Host header allowlist for TrustedHostMiddleware. "*" disables the check.
    # With a Redis-backed or vice versa deployment behind a proxy (Railway),
    # allow the platform host plus any custom domain.
    TRUSTED_HOSTS: list[str] = [
        h.strip()
        for h in os.getenv(
            "TRUSTED_HOSTS",
            "localhost,127.0.0.1,*.railway.app",
        ).split(",")
        if h.strip()
    ]

    # Auth rate limiting (per client IP, fixed window). 0 or negative disables.
    LOGIN_RATE_LIMIT: int = int(os.getenv("LOGIN_RATE_LIMIT", "20"))
    LOGIN_RATE_WINDOW_SECONDS: int = int(os.getenv("LOGIN_RATE_WINDOW_SECONDS", "300"))
    SIGNUP_RATE_LIMIT: int = int(os.getenv("SIGNUP_RATE_LIMIT", "10"))
    SIGNUP_RATE_WINDOW_SECONDS: int = int(os.getenv("SIGNUP_RATE_WINDOW_SECONDS", "3600"))
    VERIFY_RATE_LIMIT: int = int(os.getenv("VERIFY_RATE_LIMIT", "10"))
    VERIFY_RATE_WINDOW_SECONDS: int = int(os.getenv("VERIFY_RATE_WINDOW_SECONDS", "900"))
    RESEND_RATE_LIMIT: int = int(os.getenv("RESEND_RATE_LIMIT", "3"))
    RESEND_RATE_WINDOW_SECONDS: int = int(os.getenv("RESEND_RATE_WINDOW_SECONDS", "3600"))
    FORGOT_RATE_LIMIT: int = int(os.getenv("FORGOT_RATE_LIMIT", "3"))
    FORGOT_RATE_WINDOW_SECONDS: int = int(os.getenv("FORGOT_RATE_WINDOW_SECONDS", "3600"))
    RESET_RATE_LIMIT: int = int(os.getenv("RESET_RATE_LIMIT", "10"))
    RESET_RATE_WINDOW_SECONDS: int = int(os.getenv("RESET_RATE_WINDOW_SECONDS", "900"))

    # Account email verification / SMTP. Users create real mailboxes; a
    # 6-digit code is emailed and must be confirmed before the account works.
    ALLOWED_EMAIL_DOMAINS: list[str] = [
        d.strip().lower()
        for d in os.getenv("ALLOWED_EMAIL_DOMAINS", "gmail.com").split(",")
        if d.strip()
    ]
    EMAIL_SMTP_HOST: str = os.getenv("EMAIL_SMTP_HOST", "smtp.gmail.com")
    EMAIL_SMTP_PORT: int = int(os.getenv("EMAIL_SMTP_PORT", "587"))
    EMAIL_SMTP_TLS: bool = os.getenv("EMAIL_SMTP_TLS", "true").lower() in ("1", "true", "yes")
    EMAIL_SMTP_USER: str = os.getenv("EMAIL_SMTP_USER", "")
    EMAIL_SMTP_PASSWORD: str = os.getenv("EMAIL_SMTP_PASSWORD", "")
    EMAIL_SENDER: str = os.getenv("EMAIL_SENDER", "")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    VERIFY_CODE_TTL_MINUTES: int = int(os.getenv("VERIFY_CODE_TTL_MINUTES", "10"))
    RESET_TOKEN_TTL_MINUTES: int = int(os.getenv("RESET_TOKEN_TTL_MINUTES", "30"))

    # "Remember me": how long a session lives when the user opts in at login.
    REMEMBER_ME_DAYS: int = int(os.getenv("REMEMBER_ME_DAYS", "30"))

    # Secret-at-rest encryption (Fernet master key). Used to encrypt per-user
    # third-party API keys before they hit the database. Required in
    # production; local development falls back to a gitignored .encryption_key.
    ENCRYPTION_KEY: str = os.getenv("ENCRYPTION_KEY", "")

    # LLM
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")
   

    # Embeddings / rerankers
    EMBEDDING_MODEL: str = os.getenv(
        "EMBEDDING_MODEL", "all-MiniLM-L6-v2"
    )
    RERANKER_MODEL: str = os.getenv(
        "RERANKER_MODEL", "cross-encoder/ms-marco-MiniLM-L-6-v2"
    )

    # Vector store
    VECTOR_COLLECTION: str = os.getenv(
        "VECTOR_COLLECTION", "document_chunks"
    )
    CHROMA_PERSIST_DIR: str = os.getenv("CHROMA_PERSIST_DIR", "chroma_db")

    # File storage
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "uploads")

    # AI response cache
    CACHE_TTL_SECONDS: int = 300

   
    # RAGAS Evaluation Model
    # Fast, deterministic instruct model with an independent quota. Reasoning
    #.
    RAGAS_EVALUATION_MODEL: str = os.getenv("RAGAS_EVALUATION_MODEL", "openai/gpt-oss-120b")

    # Cap the number of questions scored in one RAGAS run (0 = all).
    # Lower it for quick smoke runs; leave unset/0 for the full evaluation.
    # Prefer a value provided directly on the shell (e.g. `MAX_EVALUATION_SAMPLES=1`)
    # over the .env setting, so smoke runs are not silently capped by .env.
    MAX_EVALUATION_SAMPLES: int = int(
        (_EXTERNAL_MAX_SAMPLES if _EXTERNAL_MAX_SAMPLES is not None else os.getenv("MAX_EVALUATION_SAMPLES", "0"))
        or "0"
    )

     # LangFuse
    LANGFUSE_PUBLIC_KEY: Optional[str] = os.getenv("LANGFUSE_PUBLIC_KEY")
    LANGFUSE_SECRET_KEY: Optional[str] = os.getenv("LANGFUSE_SECRET_KEY")
    LANGFUSE_BASE_URL: str = os.getenv("LANGFUSE_BASE_URL", "https://cloud.langfuse.com")


    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    VERSION: str = os.getenv("VERSION", "v1.0.0")

settings = Settings()

# ============================================================================
# Security validation
# ============================================================================

_UNSAFE_SECRETS = {"", "change-me", "secret", "changeme"}
_secret_value = settings.SECRET_KEY.lower().strip()

if settings.ENVIRONMENT == "production" and _secret_value in _UNSAFE_SECRETS:
    # Hard fail: a production deployment MUST have a real secret. Starting
    # without one otherwise exposes every user's account to JWT forgery.
    raise RuntimeError(
        "SECRET_KEY is not set or is set to an unsafe default. "
        "Set a strong, random SECRET_KEY (e.g. via Railway variables) "
        "before starting the application."
    )
elif _secret_value in _UNSAFE_SECRETS:
    print(
        "⚠️  WARNING: SECRET_KEY is unset or an unsafe default. "
        "This is fine for local development only; set it in production."
    )

# ============================================================================
# ENCRYPTION_KEY: master key for encrypting per-user API keys at rest.
# ============================================================================

if settings.ENVIRONMENT == "production" and not settings.ENCRYPTION_KEY:
    raise RuntimeError(
        "ENCRYPTION_KEY is not set. Generate one with: "
        "python -c \"from cryptography.fernet import Fernet; "
        "print(Fernet.generate_key().decode())\" and set it via Railway "
        "variables before starting the application."
    )

if not settings.ENCRYPTION_KEY:
    # Local development convenience: load-or-create a gitignored key file so
    # already-stored encrypted values stay decryptable across restarts.
    from pathlib import Path

    from cryptography.fernet import Fernet

    _key_file = Path(__file__).resolve().parent.parent.parent / ".encryption_key"
    if _key_file.exists():
        settings.ENCRYPTION_KEY = _key_file.read_text(encoding="utf-8").strip()
    else:
        settings.ENCRYPTION_KEY = Fernet.generate_key().decode()
        _key_file.write_text(settings.ENCRYPTION_KEY + "\n", encoding="utf-8")
        print(
            "🔑 Generated a local .encryption_key file (gitignored). "
            "In production, set ENCRYPTION_KEY explicitly."
        )

def _validate_encryption_key(value: str) -> None:
    """Fail fast on a malformed Fernet key instead of at first encryption."""
    try:
        from cryptography.fernet import Fernet
        Fernet(value.encode("utf-8") if isinstance(value, str) else value)
    except Exception:
        raise RuntimeError(
            "ENCRYPTION_KEY is not a valid Fernet key. Generate one with: "
            "python -c \"from cryptography.fernet import Fernet; "
            "print(Fernet.generate_key().decode())\""
        )


_validate_encryption_key(settings.ENCRYPTION_KEY)

# ============================================================================
# Email / SMTP production enforcement
# ============================================================================
# Signup creates unverified accounts that send a 6-digit code by email; without
# working SMTP credentials in production every signup fails silently, so fail
# fast instead.

if settings.ENVIRONMENT == "production":
    _missing_smtp = not (settings.EMAIL_SMTP_USER and settings.EMAIL_SMTP_PASSWORD)
    _missing_frontend = settings.FRONTEND_URL.startswith("http://localhost")
    if _missing_smtp:
        raise RuntimeError(
            "EMAIL_SMTP_USER and EMAIL_SMTP_PASSWORD must be set in "
            "production (used to send verification / reset emails). "
            "Use the sender's Gmail address and a generated App Password."
        )
    if _missing_frontend:
        raise RuntimeError(
            "FRONTEND_URL must be set to the deployed frontend origin in "
            "production (reset / verification links point at it)."
        )
