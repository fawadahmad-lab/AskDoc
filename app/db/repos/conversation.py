"""Data-access functions for :class:`app.db.models.Conversation`."""

from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from app.db import models

CONVERSATION_HISTORY_LIMIT = 5


def create_conversation(
    db: Session,
    user_id: int,
    title: str | None = None,
) -> models.Conversation:
    """Create a new empty conversation owned by `user_id`."""
    conversation = models.Conversation(user_id=user_id, title=title)
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return conversation


def get_conversation_or_404(
    db: Session,
    user_id: int,
    conversation_id: int,
) -> models.Conversation:
    """Return a conversation owned by `user_id` or raise 404."""
    conversation = (
        db.query(models.Conversation)
        .filter(
            models.Conversation.id == conversation_id,
            models.Conversation.user_id == user_id,
        )
        .first()
    )
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


def list_conversations(
    db: Session,
    user_id: int,
) -> list[models.Conversation]:
    """List the conversations owned by `user_id`, most-recent first."""
    return (
        db.query(models.Conversation)
        .filter(models.Conversation.user_id == user_id)
        .order_by(models.Conversation.updated_at.desc())
        .all()
    )


def delete_conversation(
    db: Session,
    user_id: int,
    conversation_id: int,
) -> None:
    """Delete a conversation owned by `user_id` and its messages."""
    conversation = get_conversation_or_404(db, user_id, conversation_id)
    db.query(models.Message).filter(
        models.Message.conversation_id == conversation_id
    ).delete()
    db.delete(conversation)
    db.commit()


def rename_conversation(
    db: Session,
    user_id: int,
    conversation_id: int,
    title: str | None,
) -> models.Conversation:
    """Rename a conversation owned by `user_id` and return it."""
    conversation = get_conversation_or_404(db, user_id, conversation_id)
    conversation.title = title
    conversation.updated_at = func.now()
    db.commit()
    db.refresh(conversation)
    return conversation


def get_conversation_history(
    db: Session,
    conversation_id: int,
    limit: int = CONVERSATION_HISTORY_LIMIT,
) -> list[dict]:
    """Return recent history as `{question, answer}` pairs, oldest first."""
    messages = (
        db.query(models.Message)
        .filter(models.Message.conversation_id == conversation_id)
        .order_by(models.Message.created_at.asc(), models.Message.id.asc())
        .all()
    )

    pairs: list[dict] = []
    pending: str | None = None
    for message in messages:
        if message.role == "user":
            pending = message.content
        elif message.role == "assistant" and pending is not None:
            pairs.append({"question": pending, "answer": message.content})
            pending = None

    return pairs[-limit:]


def save_conversation_message(
    db: Session,
    conversation_id: int,
    role: str,
    content: str,
    citations: list | None = None,
    document_id: int | None = None,
) -> models.Message:
    """Append a message row to a conversation and touch its updated_at."""
    message = models.Message(
        conversation_id=conversation_id,
        role=role,
        content=content,
        citations=citations,
        document_id=document_id,
    )
    db.add(message)

    conversation = (
        db.query(models.Conversation)
        .filter(models.Conversation.id == conversation_id)
        .first()
    )
    if conversation is not None:
        conversation.updated_at = func.now()

    db.commit()
    db.refresh(message)
    return message
