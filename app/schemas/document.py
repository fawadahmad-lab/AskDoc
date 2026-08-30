"""Document Pydantic schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DocumentResponse(BaseModel):
    id: int
    filename: str
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
