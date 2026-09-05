"""AI response caching backed by Redis."""

import hashlib
import json
import logging

from app.cache.redis import redis_client
from app.core.config import settings

logger = logging.getLogger(__name__)

CACHE_TTL = settings.CACHE_TTL_SECONDS


def build_cache_key(
    user_id: int,
    question: str,
    document_id: int | None = None,
) -> str:
    """Create a deterministic Redis key for an AI question.

    Includes ``user_id`` so a Groq key rotation can flush only the affected
    user's cached answers.
    """
    raw_key = (
        f"{user_id}:"
        f"{document_id}:"
        f"{question.strip().lower()}"
    )

    question_hash = hashlib.sha256(raw_key.encode()).hexdigest()

    return f"ai:response:{user_id}:{question_hash}"


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


def delete_user_cached_responses(user_id: int) -> None:
    """Delete all cached responses for a given user.

    Used after a Groq API key rotation so stale answers generated under the
    old key are not served. Fail-open on Redis errors so this never blocks
    the user flow.
    """
    pattern = f"ai:response:{user_id}:*"
    try:
        keys = list(redis_client.scan_iter(match=pattern, count=1000))
        if keys:
            redis_client.delete(*keys)
            logger.debug("Flushed %d cached responses for user %d", len(keys), user_id)
    except Exception:
        logger.debug("Failed to flush cached responses for user %d", user_id, exc_info=True)