"""Top-level re-exports of every schema used by the API routers."""

from app.schemas.auth import (
    UserCreate,
    GroqKeyUpdate,
    TokenResponse,
    UserResponse,
    VerifyEmailRequest,
    ResendVerificationRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
    CitationResponse,
)
from app.schemas.document import DocumentResponse
from app.schemas.conversation import (
    ConversationCreate,
    ConversationResponse,
    MessageResponse,
    ConversationDetail,
)

__all__ = [
    "UserCreate",
    "GroqKeyUpdate",
    "TokenResponse",
    "UserResponse",
    "VerifyEmailRequest",
    "ResendVerificationRequest",
    "ForgotPasswordRequest",
    "ResetPasswordRequest",
    "ChatRequest",
    "ChatResponse",
    "CitationResponse",
    "DocumentResponse",
    "ConversationCreate",
    "ConversationResponse",
    "MessageResponse",
    "ConversationDetail",
]
