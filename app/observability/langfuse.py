"""Optional Langfuse observability integration.

Langfuse degrades gracefully (no-op, no trace export) when no keys are
configured, so every helper here is safe to call in any environment.
"""

from langfuse import get_client


_langfuse = get_client()


def flush_langfuse() -> None:
    """Flush pending Langfuse events.

    Call on application shutdown so buffered traces are not lost.
    """
    try:
        _langfuse.flush()
    except Exception:
        pass
