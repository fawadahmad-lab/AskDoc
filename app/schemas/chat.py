"""Chat request/response Pydantic schemas."""

from pydantic import BaseModel


class ChatRequest(BaseModel):
    question: str
    document_id: int | None = None
    conversation_id: int | None = None


class CitationResponse(BaseModel):
    document_id: int
    page_number: int


class ChatResponse(BaseModel):
    answer: str
    citations: list[CitationResponse]
    cached: bool = False
    conversation_id: int | None = None
