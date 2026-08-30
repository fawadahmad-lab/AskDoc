"""LLM client for generation."""

from langchain_core.messages import HumanMessage
from langchain_groq import ChatGroq

from app.core.config import settings

_llm = ChatGroq(
    model=settings.LLM_MODEL,
    temperature=0,
    api_key=settings.GROQ_API_KEY,
)


def generate_answer(prompt: str) -> str:
    """Generate an answer using the LLM."""
    messages = [HumanMessage(content=prompt)]
    response = _llm.invoke(messages)

    return response.content.strip()
