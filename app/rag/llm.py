"""LLM client for generation."""

import re
from functools import lru_cache

from langchain_core.messages import HumanMessage
from langchain_groq import ChatGroq
from langfuse import observe
from app.core.config import settings

# Defensive: strip any reasoning/thinking preamble that still leaks into the
# content (e.g. models/settings where reasoning cannot be fully disabled).
_THINKING_PRELUDE = re.compile(
    r"^\s*(?:<?/?thinking>|thinking|reasoning)\s*[\n:]*",
    re.IGNORECASE,
)


def _chat_params(model: str) -> dict:
    """Return model-appropriate reasoning suppression params.

    Groq's `reasoning_effort` is only a valid request param for models that
    support it (e.g. qwen3, which accepts `none`). `openai/gpt-oss-*` rejects
    `none` (only `low|medium|high`), but supports `reasoning_format="hidden"`
    to keep thinking out of `content`. Anything else gets plain defaults.
    """
    lower = model.lower()
    if "gpt-oss" in lower:
        return {"reasoning_format": "hidden"}
    if "qwen" in lower:
        # qwen3 reasoning models otherwise emit their chain-of-thought inside
        # `content`, polluting every generated answer with a "thinking process"
        # preamble.
        return {"reasoning_effort": "none"}
    return {}


@lru_cache(maxsize=256)
def create_llm(api_key: str, model: str) -> ChatGroq:
    """Build a ChatGroq client for a specific API key + model.

    Cached per (api_key, model); per-user keys mean each authenticated user
    gets their own client keyed by their credential.
    """
    return ChatGroq(
        model=model,
        temperature=0,
        api_key=api_key,
        **_chat_params(model),
    )


# Module-level fallback keyed to the deployment's Groq key. Used by the
# development/evaluation harness when no per-user key is available; the
# product path always passes the authenticated user's own key.
_llm = create_llm(api_key=settings.GROQ_API_KEY, model=settings.GROQ_MODEL)


@observe(
    name="llm-generation",
    as_type="generation",
)
def generate_answer(prompt: str, api_key: str | None = None) -> str:
    """Generate an answer using the user's Groq key (or the app fallback)."""
    llm = (
        create_llm(api_key=api_key, model=settings.GROQ_MODEL)
        if api_key
        else _llm
    )
    messages = [HumanMessage(content=prompt)]
    response = llm.invoke(messages)
    text = response.content.strip()
    text = _THINKING_PRELUDE.sub("", text).strip()
    return text