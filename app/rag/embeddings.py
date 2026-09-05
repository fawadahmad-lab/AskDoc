"""Sentence embedding generation."""

from typing import List

from sentence_transformers import SentenceTransformer

from app.core.config import settings


# Load the embedding model lazily.
# This prevents model downloads/loading during application import and pytest
# collection. The model is created only when embeddings are actually needed.
_model: SentenceTransformer | None = None


def _get_model() -> SentenceTransformer:
    """Load the embedding model lazily on first use."""
    global _model

    if _model is None:
        _model = SentenceTransformer(settings.EMBEDDING_MODEL)

    return _model


def generate_embeddings(text) -> List[List[float]]:
    """Return L2-normalized embeddings for `text`.

    Accepts either a single string or a list of strings and always returns a
    list-of-lists.
    """
    if not text:
        return []

    embeddings = _get_model().encode(
        text,
        normalize_embeddings=True,
    )

    return embeddings.tolist()