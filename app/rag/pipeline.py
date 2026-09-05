# app/rag/pipeline.py

"""End-to-end RAG pipeline that answers a question against user documents."""

import time

from langfuse import observe

from app.rag.generation import generate_grounded_response
from app.rag.reranker import reranker
from app.rag.retrieval import search_chunks


@observe(
    name="rag-pipeline",
    as_type="chain",
    capture_input=True,
    capture_output=True,
)
def run_rag_pipeline(
    question: str,
    user_id: int,
    document_id: int | None = None,
    history: list[dict] | None = None,
    groq_api_key: str | None = None,
) -> dict:
    """
    Complete RAG pipeline with LangFuse instrumentation.

    ``groq_api_key`` is the authenticated user's own Groq key; when omitted
    (e.g. the development/evaluation harness) the app-level fallback key is
    used by generation.
    """
    pipeline_start = time.perf_counter()

    # Step 1: Retrieval
    retrieval_start = time.perf_counter()
    results = search_chunks(
        query=question,
        top_k=10,
        user_id=user_id,
        document_id=document_id,
    )
    retrieval_latency = time.perf_counter() - retrieval_start

    # Step 2: Reranking
    rerank_start = time.perf_counter()
    reranked_results = reranker().rerank(
        query=question,
        results=results,
        top_k=3,
    )
    rerank_latency = time.perf_counter() - rerank_start

    # Step 3: Generation
    generation_start = time.perf_counter()
    response = generate_grounded_response(
        question=question,
        results=reranked_results,
        history=history or [],
        api_key=groq_api_key,
    )
    generation_latency = time.perf_counter() - generation_start

    total_latency = time.perf_counter() - pipeline_start

    # Add latency breakdown to response
    response["retrieval_latency"] = retrieval_latency
    response["rerank_latency"] = rerank_latency
    response["generation_latency"] = generation_latency
    response["total_latency"] = total_latency

    # Add metadata to current span
    try:
        from langfuse import get_client
        langfuse = get_client()
        if hasattr(langfuse, "get_current_span"):
            current_span = langfuse.get_current_span()
            if current_span:
                current_span.update(
                    metadata={
                        "retrieval_latency_ms": round(retrieval_latency * 1000, 2),
                        "rerank_latency_ms": round(rerank_latency * 1000, 2),
                        "generation_latency_ms": round(generation_latency * 1000, 2),
                        "total_latency_ms": round(total_latency * 1000, 2),
                        "citation_count": len(response.get("citations", [])),
                        "citation_accuracy": response.get("citation_accuracy", 0.0),
                        "groundedness": response.get("groundedness", False),
                    }
                )
    except Exception:
        pass

    return response