"""Sentence embedding generation."""

from typing import List

from sentence_transformers import SentenceTransformer

from app.core.config import settings

_model = SentenceTransformer(settings.EMBEDDING_MODEL)


def generate_embeddings(text) -> List[List[float]]:
    """Return L2-normalized embeddings for `text`.

    Accepts either a single string or a list of strings and always returns a
    list-of-lists.
    """
    if not text:
        return []

    embeddings = _model.encode(
        text,
        normalize_embeddings=True,
    )

    return embeddings.tolist()
