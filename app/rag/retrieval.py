# app/rag/retrieval.py

"""Vector retrieval: indexing, searching and deleting chunks."""

import time
from typing import Optional
from langfuse import observe

from app.rag.embeddings import generate_embeddings
from app.rag.vector_store import VectorStore
from app.core.config import settings


vector_store = VectorStore()


@observe(
    name="index-chunks",
    as_type="retriever",
)
def index_chunks(chunks: list[dict]) -> None:
    """Generate embeddings and store chunks permanently."""
    if not chunks:
        return

    texts = [chunk["text"] for chunk in chunks]
    embeddings = generate_embeddings(texts)

    metadata = [
        {
            "document_id": chunk["document_id"],
            "user_id": chunk["user_id"],
            "page_number": chunk["page_number"],
            "chunk_index": chunk["chunk_index"],
            "text": chunk["text"],
        }
        for chunk in chunks
    ]

    vector_store.add(
        embeddings=embeddings,
        metadata=metadata,
    )


@observe(
    name="search-chunks",
    as_type="retriever",
    capture_input=True,
    capture_output=True,
)
def search_chunks(
    query: str,
    top_k: int = 5,
    user_id: int | None = None,
    document_id: int | None = None,
) -> list[dict]:
    """
    Embed the query and search persistent vectors.
    """
    start_time = time.perf_counter()

    query_embedding = generate_embeddings([query])[0]

    results = vector_store.search(
        query_embedding=query_embedding,
        top_k=top_k,
        user_id=user_id,
        document_id=document_id,
    )

    latency_ms = (time.perf_counter() - start_time) * 1000

    # Add metadata to current span if available
    try:
        from langfuse import get_client
        langfuse = get_client()
        if hasattr(langfuse, "get_current_span"):
            current_span = langfuse.get_current_span()
            if current_span:
                retrieved_pages = []
                if results:
                    for result in results:
                        page = result.get("metadata", {}).get("page_number")
                        if page:
                            retrieved_pages.append(page)

                current_span.update(
                    metadata={
                        "latency_ms": round(latency_ms, 2),
                        "results_count": len(results),
                        "retrieved_pages": retrieved_pages,
                    }
                )
    except Exception:
        pass

    return results


@observe(
    name="delete-chunks",
    as_type="retriever",
)
def delete_chunks(
    document_id: int,
    user_id: int,
) -> None:
    """Remove all vectors belonging to a document."""
    vector_store.delete_document(
        document_id=document_id,
        user_id=user_id,
    )