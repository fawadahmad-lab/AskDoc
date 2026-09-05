"""SQLAlchemy ORM models."""

from sqlalchemy import (
    Column,
    Integer,
    String,
    ForeignKey,
    DateTime,
    Text,
    JSON,
)
from sqlalchemy.sql import func

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    groq_api_key_enc = Column(Text, nullable=True)
    email_verified_at = Column(DateTime(timezone=True), nullable=True)
    verify_code_hash = Column(String, nullable=True)
    verify_code_expires = Column(DateTime(timezone=True), nullable=True)
    reset_token_hash = Column(String, nullable=True)
    reset_token_expires = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    @property
    def has_groq_api_key(self) -> bool:
        return bool(self.groq_api_key_enc)

    @property
    def is_email_verified(self) -> bool:
        return bool(self.email_verified_at)

    @property
    def groq_api_key_masked(self) -> str | None:
        from app.core.crypto import decrypt_secret, mask_secret

        if not self.groq_api_key_enc:
            return None
        try:
            return mask_secret(decrypt_secret(self.groq_api_key_enc))
        except ValueError:
            return None


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(
        Integer,
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    citations = Column(JSON, nullable=True)
    document_id = Column(
        Integer,
        ForeignKey("documents.id"),
        nullable=True,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())
