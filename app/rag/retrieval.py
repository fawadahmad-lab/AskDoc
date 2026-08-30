"""Vector retrieval: indexing, searching and deleting chunks."""

from app.rag.embeddings import generate_embeddings
from app.rag.vector_store import VectorStore

vector_store = VectorStore()


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


def search_chunks(
    query: str,
    top_k: int = 5,
    user_id: int | None = None,
    document_id: int | None = None,
) -> list[dict]:
    """Embed the query and search persistent vectors."""
    query_embedding = generate_embeddings([query])[0]

    return vector_store.search(
        query_embedding=query_embedding,
        top_k=top_k,
        user_id=user_id,
        document_id=document_id,
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
