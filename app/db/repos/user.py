"""Data-access functions for :class:`app.db.models.User`."""

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.db import models


def get_user_by_email_or_username(
    db: Session, email: str, username: str
) -> models.User | None:
    return (
        db.query(models.User)
        .filter(
            or_(
                models.User.email == email,
                models.User.username == username,
            )
        )
        .first()
    )


def get_user_by_username(db: Session, username: str) -> models.User | None:
    return (
        db.query(models.User)
        .filter(models.User.username == username)
        .first()
    )


def get_user_by_id(db: Session, user_id: int) -> models.User | None:
    return db.query(models.User).filter(models.User.id == user_id).first()


def create_user(
    db: Session, email: str, username: str, password: str
) -> models.User:
    user = models.User(
        email=email,
        username=username,
        hashed_password=hash_password(password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
