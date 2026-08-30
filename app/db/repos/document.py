"""Data-access functions for :class:`app.db.models.Document`."""

from sqlalchemy.orm import Session

from app.db import models


def list_documents(db: Session, user_id: int) -> list[models.Document]:
    return (
        db.query(models.Document)
        .filter(models.Document.user_id == user_id)
        .order_by(models.Document.created_at.desc())
        .all()
    )


def get_document(
    db: Session, document_id: int, user_id: int
) -> models.Document | None:
    return (
        db.query(models.Document)
        .filter(
            models.Document.id == document_id,
            models.Document.user_id == user_id,
        )
        .first()
    )


def create_document(
    db: Session, user_id: int, filename: str, file_path: str
) -> models.Document:
    document = models.Document(
        user_id=user_id,
        filename=filename,
        file_path=file_path,
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return document


def detach_messages_from_document(db: Session, document_id: int) -> None:
    """Null out the document FK on messages pointing at a deleted document."""
    db.query(models.Message).filter(
        models.Message.document_id == document_id
    ).update({models.Message.document_id: None}, synchronize_session=False)


def delete_document(db: Session, document: models.Document) -> None:
    db.delete(document)
    db.commit()
