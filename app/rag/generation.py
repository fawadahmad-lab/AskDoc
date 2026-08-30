"""Grounded answer generation from retrieved chunks."""

from typing import List

from app.rag.llm import generate_answer

NO_ANSWER = (
    "I could not find an answer to your question "
    "in the provided documents."
)


def build_context(results: List[dict]) -> str:
    """Build grounded context from retrieved chunks."""
    context_parts = []

    for result in results:
        metadata = result["metadata"]

        context_parts.append(
            f"[Document {metadata['document_id']} | "
            f"Page {metadata['page_number']}]\n"
            f"{metadata['text']}"
        )

    return "\n\n".join(context_parts)


def build_citations(results: List[dict]) -> List[dict]:
    """Extract unique document/page citations, preserving order."""
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
                }
            )
            seen.add(citation_key)

    return citations


def generate_grounded_response(
    question: str,
    results: List[dict],
    history: List[dict] | None = None,
) -> dict:
    """Generate an answer strictly grounded in retrieved chunks."""
    if not results:
        return {
            "answer": NO_ANSWER,
            "citations": [],
        }

    context = build_context(results)

    history = history or []

    history_text = "\n".join(
        [
            f"User: {item['question']}\n"
            f"Assistant: {item['answer']}"
            for item in reversed(history)
        ]
    )

    prompt = f"""
    ```
    You are a document question-answering assistant.

    Answer the question using ONLY the information provided
    in the document context below.

    STRICT RULES:

    * Do not use outside knowledge.
    * Do not make assumptions.
    * Do not invent information.
    * If the answer cannot be found in the context, respond
    with exactly:
    "{NO_ANSWER}"
    * Keep the answer concise and factual.
    
    CONVERSATION HISTORY:
    {history_text}

    DOCUMENT CONTEXT:
    {context}

    QUESTION:
    {question}

    ANSWER:
    """

    answer = generate_answer(prompt)

    return {
        "answer": answer,
        "citations": build_citations(results),
    }
