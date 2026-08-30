"""Conversation routes: list, create, get, delete and rename."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.base import get_db
from app.db import models
from app.db.repos import conversation as conversation_repo
from app.schemas import (
    ConversationCreate,
    ConversationResponse,
    ConversationDetail,
)

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.get("", response_model=list[ConversationResponse])
def get_conversations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """List the authenticated user's conversations, most-recent first."""
    return conversation_repo.list_conversations(db, current_user.id)


@router.post("", response_model=ConversationResponse, status_code=201)
def create_conversation_endpoint(
    payload: ConversationCreate | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Manually create a new, empty conversation."""
    title = None
    if payload is not None:
        title = payload.title
    return conversation_repo.create_conversation(
        db=db,
        user_id=current_user.id,
        title=title,
    )


@router.get("/{conversation_id}", response_model=ConversationDetail)
def get_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get a conversation owned by the current user and its messages."""
    conversation = conversation_repo.get_conversation_or_404(
        db,
        current_user.id,
        conversation_id,
    )
    messages = (
        db.query(models.Message)
        .filter(models.Message.conversation_id == conversation_id)
        .order_by(models.Message.created_at.asc(), models.Message.id.asc())
        .all()
    )
    conversation.messages = messages
    return conversation


@router.delete("/{conversation_id}", status_code=204)
def delete_conversation_endpoint(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Delete a conversation owned by the current user and its messages."""
    conversation_repo.delete_conversation(db, current_user.id, conversation_id)
    return None


@router.patch("/{conversation_id}", response_model=ConversationResponse)
def rename_conversation_endpoint(
    conversation_id: int,
    payload: ConversationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Rename a conversation owned by the current user."""
    return conversation_repo.rename_conversation(
        db=db,
        user_id=current_user.id,
        conversation_id=conversation_id,
        title=payload.title,
    )
