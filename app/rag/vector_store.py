"""Persistent Chroma vector store."""

import chromadb
from chromadb.config import Settings

from app.core.config import settings


class VectorStore:
    def __init__(
        self,
        collection_name: str = None,
        persist_directory: str = None,
    ):
        self.client = chromadb.PersistentClient(
            path=persist_directory or settings.CHROMA_PERSIST_DIR,
            settings=Settings(anonymized_telemetry=False),
        )
        self.collection = self.client.get_or_create_collection(
            name=collection_name or settings.VECTOR_COLLECTION,
            metadata={
                "description": "Embedded chunks from user documents"
            },
        )

    def add(
        self,
        embeddings: list[list[float]],
        metadata: list[dict],
    ) -> None:
        """Store embeddings and their metadata permanently."""
        if not embeddings:
            return

        ids = [
            (
                f"doc_{item['document_id']}"
                f"_page_{item['page_number']}"
                f"_chunk_{item['chunk_index']}"
            )
            for item in metadata
        ]

        documents = [
            item["text"]
            for item in metadata
        ]

        chroma_metadata = [
            {
                "document_id": int(item["document_id"]),
                "user_id": int(item["user_id"]),
                "page_number": int(item["page_number"]),
                "chunk_index": int(item["chunk_index"]),
            }
            for item in metadata
        ]

        self.collection.upsert(
            ids=ids,
            embeddings=embeddings,
            documents=documents,
            metadatas=chroma_metadata,
        )

    def search(
        self,
        query_embedding: list[float],
        top_k: int = 5,
        user_id: int | None = None,
        document_id: int | None = None,
    ) -> list[dict]:
        """Search embeddings with metadata filtering."""
        where_conditions = []

        if user_id is not None:
            where_conditions.append(
                {"user_id": {"$eq": int(user_id)}}
            )

        if document_id is not None:
            where_conditions.append(
                {"document_id": {"$eq": int(document_id)}}
            )

        where = None

        if len(where_conditions) == 1:
            where = where_conditions[0]
        elif len(where_conditions) > 1:
            where = {"$and": where_conditions}

        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where=where,
            include=["documents", "metadatas", "distances"],
        )

        formatted_results = []

        if not results["ids"][0]:
            return []

        for document, metadata, distance in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            formatted_results.append(
                {
                    "score": float(1 - distance),
                    "metadata": {
                        **metadata,
                        "text": document,
                    },
                }
            )

        return formatted_results

    def delete_document(
        self,
        document_id: int,
        user_id: int,
    ) -> None:
        """Remove all vectors belonging to a document."""
        self.collection.delete(
            where={
                "$and": [
                    {"document_id": {"$eq": int(document_id)}},
                    {"user_id": {"$eq": int(user_id)}},
                ]
            }
        )
