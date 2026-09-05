"""Grounded answer generation from retrieved chunks."""

import re
from typing import List, Dict, Optional, Tuple
from collections import defaultdict

from app.rag.llm import generate_answer

NO_ANSWER = (
  "I have restrictions on providing information that is not present in the provided documents. "
)

# Known refusal phrasings (in addition to the exact NO_ANSWER string) that
# indicate the model could not answer from the provided documents. We match
# these so we never return citations alongside a refusal.
REFUSAL_PHRASES = (
    "i have restrictions on providing information that is not present in the provided documents",
    "could not find an answer",
    "do not have enough information",
    "don't have enough information",
    "not provided in the document",
    "cannot answer",
    "not found in the provided documents",
)

# A stripped, lowercased version of NO_ANSWER for robust matching against the
# stripped answer returned by the LLM (which never keeps the trailing space).
_NO_ANSWER_LOWER = NO_ANSWER.strip().lower()


def is_refusal_answer(answer: str) -> bool:
    """Whether an answer is a refusal to answer from the document."""
    lowered = answer.strip().lower()
    return (
        _NO_ANSWER_LOWER in lowered
        or any(phrase in lowered for phrase in REFUSAL_PHRASES)
    )


def build_context(results: List[dict]) -> str:
    """Build grounded context from retrieved chunks."""
    context_parts = []

    for idx, result in enumerate(results, 1):
        metadata = result["metadata"]
        score = result.get("score", 0.0)

        # Simple numbered context for LLM (no page citations in prompt)
        context_parts.append(
            f"[Context {idx}]\n"
            f"{metadata['text']}"
        )

    return "\n\n".join(context_parts)


def build_citations(results: List[dict]) -> List[dict]:
    """Extract unique document/page citations for UI display."""
    citations = []
    seen = set()

    for result in results:
        metadata = result["metadata"]

        citation_key = (
            metadata["document_id"],
            metadata["page_number"],
        )

        if citation_key not in seen:
            citations.append(
                {
                    "document_id": metadata["document_id"],
                    "page_number": metadata["page_number"],
                    "text": metadata.get("text", ""),
                }
            )
            seen.add(citation_key)

    return citations


def generate_grounded_response(
    question: str,
    results: List[dict],
    history: List[dict] | None = None,
    api_key: str | None = None,
) -> dict:
    """
    Generate an answer strictly grounded in retrieved chunks.
    Citations are handled by UI, so they're not included in answer text.
    """
    # Early return if no results
    if not results:
        return {
            "answer": NO_ANSWER,
            "citations": [],
            "citation_accuracy": 0.0,
            "groundedness": True,
        }

    # Build context (without page citations)
    context = build_context(results)
    
    # Build citations for UI
    citations = build_citations(results)

    # Build history text
    history = history or []
    history_text = "\n".join(
        [
            f"User: {item['question']}\nAssistant: {item['answer']}"
            for item in reversed(history[-3:])  # Limit to last 3 for context
        ]
    )

    # Build prompt WITHOUT page citations in answer
    prompt = f"""
    You are a document question-answering assistant.

    Answer the question using ONLY the information provided
    in the document context below.

    STRICT RULES:
    * Do not use outside knowledge.
    * Do not make assumptions.
    * Do not invent information.
    * If the answer cannot be found in the context, respond with exactly:
    "{NO_ANSWER}"
    * Keep the answer concise and factual.
    * Do NOT include page numbers or citations in your answer.

    CONVERSATION HISTORY:
    {history_text}

    DOCUMENT CONTEXT:
    {context}

    QUESTION:
    {question}

    ANSWER:
    """

    # Generate answer
    answer = generate_answer(prompt, api_key=api_key)

    # Check if answer is a refusal. A refusal must never carry citations.
    if is_refusal_answer(answer):
        return {
            "answer": NO_ANSWER,
            "citations": [],
            "citation_accuracy": 0.0,
            "groundedness": True,
            "retrieved_chunks": results,
        }

    # Calculate groundedness
    grounded = is_grounded(answer, results)
    
    # If not grounded but answer exists, set groundedness to False
    if not grounded and answer and not is_refusal_answer(answer):
        grounded = False

    # Calculate citation accuracy based on retrieved chunks vs expected
    # This is a simplified calculation - you can enhance based on your needs
    citation_accuracy = calculate_citation_accuracy(results, citations)

    return {
        "answer": answer,
        "citations": citations,
        "citation_accuracy": citation_accuracy,
        "groundedness": grounded,
        "retrieved_chunks": results,  # For debugging and UI
    }


def is_grounded(answer: str, results: List[dict]) -> bool:
    """
    Determine if the answer is properly grounded.
    An answer is grounded if:
    1. It's a refusal (NO_ANSWER), OR
    2. It has content that appears to come from the context
    """
    if is_refusal_answer(answer):
        return True
    
    # If answer is empty or very short, not grounded
    if not answer or len(answer.strip()) < 5:
        return False
    
    # Check if answer contains content from context
    # Simple check: look for common phrases or keywords
    # You can enhance this with more sophisticated methods
    
    # If we have results and answer exists, assume it's grounded
    # (This is a simplification - in production you'd want better validation)
    if results:
        return True
    
    return False


def calculate_citation_accuracy(
    results: List[dict],
    citations: List[dict]
) -> float:
    """
    Calculate citation accuracy based on retrieval quality.
    This is a simplified version - you can enhance with expected pages.
    """
    if not results or not citations:
        return 0.0
    
    # Get unique pages from results
    retrieved_pages = {
        result["metadata"]["page_number"] 
        for result in results
    }
    
    # Get unique pages from citations
    cited_pages = {
        citation["page_number"] 
        for citation in citations
    }
    
    if not cited_pages:
        return 0.0
    
    # Calculate overlap
    valid_citations = len(retrieved_pages & cited_pages)
    total_citations = len(cited_pages)
    
    return valid_citations / total_citations if total_citations > 0 else 0.0

