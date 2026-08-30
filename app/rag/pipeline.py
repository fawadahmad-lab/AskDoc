"""End-to-end RAG pipeline that answers a question against user documents."""

from app.rag.generation import generate_grounded_response
from app.rag.reranker import Reranker
from app.rag.retrieval import search_chunks


def answer_question(
    question: str,
    user_id: int,
    document_id: int | None = None,
    history: list[dict] | None = None,
) -> dict:
    """Complete RAG pipeline.

    `history` is an optional list of {question, answer} dicts from the
    active conversation (built by the caller), used for context.
    """
    results = search_chunks(
        query=question,
        top_k=10,
        user_id=user_id,
        document_id=document_id,
    )

    reranker = Reranker()
    reranked_results = reranker.rerank(
        query=question,
        results=results,
        top_k=5,
    )

    response = generate_grounded_response(
        question=question,
        results=reranked_results,
        history=history or [],
    )

    return response
