"""AI response caching backed by Redis."""

import hashlib
import json

from app.cache.redis import redis_client
from app.core.config import settings

CACHE_TTL = settings.CACHE_TTL_SECONDS


def build_cache_key(
    user_id: int,
    question: str,
    document_id: int | None = None,
) -> str:
    """Create a deterministic Redis key for an AI question."""
    raw_key = (
        f"{user_id}:"
        f"{document_id}:"
        f"{question.strip().lower()}"
    )

    question_hash = hashlib.sha256(raw_key.encode()).hexdigest()

    return f"ai:response:{question_hash}"


def get_cached_response(cache_key: str):
    cached_data = redis_client.get(cache_key)

    if cached_data:
        return json.loads(cached_data)

    return None


def cache_response(cache_key: str, response: dict):
    redis_client.set(
        cache_key,
        json.dumps(response),
        ex=CACHE_TTL,
    )
