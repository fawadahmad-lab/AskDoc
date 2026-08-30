"""Conversation Pydantic schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.chat import CitationResponse


class ConversationCreate(BaseModel):
    title: str | None = None


class ConversationResponse(BaseModel):
    id: int
    title: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class MessageResponse(BaseModel):
    id: int
    role: str
    content: str
    citations: list[CitationResponse] | None = None
    document_id: int | None = None
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class ConversationDetail(ConversationResponse):
    messages: list[MessageResponse] = []
