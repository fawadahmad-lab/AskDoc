"""Rate limiting backed by Redis.

Fixed-window counters keyed by client identity (IP when unauthenticated).
Designed for authentication endpoints: protects against brute-force login and
mass signup from a single source.

Behavior notes
--------------
* Counters are scoped to a time window, so the limit naturally resets.
* If Redis is unavailable the limiter fails open: an outage must never lock
  real users out of their own accounts. Log the failure instead.
* The client IP is read from ``X-Forwarded-For`` first because the app runs
  behind a trusted proxy (Railway); ``request.client.host`` would otherwise be
  the proxy itself, putting every user in one shared bucket.
"""

from collections.abc import Callable

from fastapi import HTTPException, Request, status
from redis.exceptions import RedisError

from app.cache.redis import redis_client


class RateLimitExceeded(HTTPException):
    """Raised when a client exceeds its window limit (HTTP 429)."""

    def __init__(self, retry_after: int) -> None:
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please try again later.",
            headers={"Retry-After": str(max(retry_after, 1))},
        )


def _client_ip(request: Request) -> str:
    """Best-effort real client IP, preferring the proxy-provided header."""
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client is not None:
        return request.client.host
    return "unknown"


def check_rate_limit(bucket: str, limit: int, window_seconds: int) -> None:
    """Increment a fixed-window counter and raise 429 when ``limit`` exceeded."""
    if limit <= 0:
        return

    import time

    window_start = int(time.time()) - (int(time.time()) % window_seconds)
    key = f"ratelimit:{bucket}:{window_start}"

    try:
        count = redis_client.incr(key)
        if count == 1:
            redis_client.expire(key, window_seconds)

        if count > limit:
            retry_after = window_start + window_seconds - int(time.time())
            raise RateLimitExceeded(retry_after)
    except RateLimitExceeded:
        raise
    except RedisError:
        # Fail open: auth availability is more important than rate limiting.
        print("⚠️  Rate limiter unavailable (Redis down); skipping limit check.")


def rate_limit(
    bucket: str,
    limit: int,
    window_seconds: int,
) -> Callable:
    """FastAPI dependency factory: per-IP rate limit for ``bucket``.

    Usage::

        router.post("/login")
        def login(_, _rate: None = Depends(rate_limit("login", 20, 300))):
            ...
    """

    def dependency(request: Request) -> None:
        client = _client_ip(request)
        check_rate_limit(f"{bucket}:{client}", limit, window_seconds)

    return dependency