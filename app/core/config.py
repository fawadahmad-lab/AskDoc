"""Application configuration loaded from the environment."""

import os

from dotenv import load_dotenv

load_dotenv(override=True)


class Settings:
    """Centralised runtime configuration.

    Every secret / endpoint / model identifier is read here once so the rest
    of the application never pokes at ``os.environ`` directly.
    """

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")

    # Redis cache
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # Auth / JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # LLM
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "openai/gpt-oss-20b")

    # Embeddings / rerankers
    EMBEDDING_MODEL: str = os.getenv(
        "EMBEDDING_MODEL", "all-MiniLM-L6-v2"
    )
    RERANKER_MODEL: str = os.getenv(
        "RERANKER_MODEL", "cross-encoder/ms-marco-MiniLM-L-6-v2"
    )

    # Vector store
    VECTOR_COLLECTION: str = os.getenv(
        "VECTOR_COLLECTION", "document_chunks"
    )
    CHROMA_PERSIST_DIR: str = os.getenv("CHROMA_PERSIST_DIR", "chroma_db")

    # File storage
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "uploads")

    # AI response cache
    CACHE_TTL_SECONDS: int = 300


settings = Settings()
