"""Authentication request/response Pydantic schemas."""

from pydantic import BaseModel, ConfigDict, field_validator

from app.core.groq_keys import looks_like_groq_key


def normalize_email(email: str) -> str:
    """Canonical form: lowercase, and for Gmail strip dots and ``+tags``.

    Gmail treats ``jane.doe+trip@gmail.com`` and ``janedoe@gmail.com`` as the
    same inbox, so collapsing aliases prevents one mailbox registering twice.
    Returns an empty string for malformed input.
    """
    email = (email or "").strip().lower()
    if "@" not in email:
        return ""
    local, _, domain = email.rpartition("@")
    if not local or "." not in domain:
        return ""
    if domain == "gmail.com":
        local = local.replace(".", "").split("+", 1)[0]
    return f"{local}@{domain}"


class UserCreate(BaseModel):
    email: str
    username: str
    password: str
    groq_api_key: str

    @field_validator("email")
    @classmethod
    def normalize_and_check_email(cls, value: str) -> str:
        normalized = normalize_email(value)
        if not normalized:
            raise ValueError("Enter a valid email address")
        return normalized

    @field_validator("groq_api_key")
    @classmethod
    def validate_groq_key_shape(cls, value: str) -> str:
        value = (value or "").strip()
        if not looks_like_groq_key(value):
            raise ValueError(
                "Invalid Groq API key. Create one at "
                "https://console.groq.com/keys"
            )
        return value


class GroqKeyUpdate(BaseModel):
    groq_api_key: str

    @field_validator("groq_api_key")
    @classmethod
    def validate_groq_key_shape(cls, value: str) -> str:
        value = (value or "").strip()
        if not looks_like_groq_key(value):
            raise ValueError(
                "Invalid Groq API key. Create one at "
                "https://console.groq.com/keys"
            )
        return value


class VerifyEmailRequest(BaseModel):
    email: str
    code: str

    @field_validator("email")
    @classmethod
    def normalize_email_field(cls, value: str) -> str:
        normalized = normalize_email(value)
        if not normalized:
            raise ValueError("Enter a valid email address")
        return normalized

    @field_validator("code")
    @classmethod
    def validate_code(cls, value: str) -> str:
        value = (value or "").strip()
        if len(value) != 6 or not value.isdigit():
            raise ValueError("Verification code must be 6 digits")
        return value


class ResendVerificationRequest(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def normalize_email_field(cls, value: str) -> str:
        normalized = normalize_email(value)
        if not normalized:
            raise ValueError("Enter a valid email address")
        return normalized


class ForgotPasswordRequest(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def normalize_email_field(cls, value: str) -> str:
        normalized = normalize_email(value)
        if not normalized:
            raise ValueError("Enter a valid email address")
        return normalized


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if len(value or "") < 8:
            raise ValueError("Password must be at least 8 characters")
        return value


class TokenResponse(BaseModel):
    access_token: str
    token_type: str


class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    has_groq_api_key: bool
    groq_api_key_masked: str | None = None
    is_email_verified: bool

    model_config = ConfigDict(from_attributes=True)