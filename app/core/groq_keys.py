"""Groq API key validation against the live Groq console API."""

import httpx


GROQ_MODELS_URL = "https://api.groq.com/openai/v1/models"
_GROQ_KEY_PREFIXES = ("gsk_", "gsk-proj-", "gsk-user-")


def looks_like_groq_key(value: str) -> bool:
    """Cheap shape check before any network call (rejects obvious typos)."""
    value = (value or "").strip()
    return len(value) >= 20 and value.startswith(_GROQ_KEY_PREFIXES)


def verify_groq_key(api_key: str) -> bool:
    """Verify a key can actually authenticate against Groq.

    Uses the user's key against GET /models; returns True only on HTTP 200.
    Any network/Groq outage is treated as a validation failure so a broken
    key never silently reaches the pipeline.
    """
    api_key = (api_key or "").strip()
    if not looks_like_groq_key(api_key):
        return False

    try:
        timeout = httpx.Timeout(15.0, connect=10.0)
        response = httpx.get(
            GROQ_MODELS_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Accept": "application/json",
            },
            timeout=timeout,
        )
    except httpx.HTTPError:
        return False

    return response.status_code == 200