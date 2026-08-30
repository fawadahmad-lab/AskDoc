"""SQLAlchemy engine, session factory, declarative base and dependency."""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.core.config import settings


def _build_engine():
    if not settings.DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not configured")
    return create_engine(
        settings.DATABASE_URL,
        pool_size=10,
        max_overflow=20,
    )


engine = _build_engine()

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a scoped session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
