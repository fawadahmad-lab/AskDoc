"""Hybrid retrieval: a simple inverted index for lexical search.

This is a basic implementation and can be improved with more advanced
techniques like stemming, lemmatization, and handling synonyms.
"""

from collections import defaultdict
import re


class LexicalStore:  # simple inverted index for lexical search
    def __init__(self):
        self.documents = []
        self.inverted_index = defaultdict(set)

    def add(self, chunks: list[dict]) -> None:
        """Add chunks to the store and update the inverted index."""
        for chunk in chunks:
            chunk_id = len(self.documents)
            self.documents.append(chunk)

            tokens = self._tokenize(chunk["text"])

            for token in set(tokens):
                self.inverted_index[token].add(chunk_id)

    def search(
        self,
        query: str,
        top_k: int = 5,
        user_id: int | None = None,
        document_id: int | None = None,
    ) -> list[dict]:
        """Lexical search over the indexed chunks using an inverted index.

        Results are scored by the number of matching query tokens and can be
        filtered by ``user_id`` / ``document_id``.
        """
        query_tokens = self._tokenize(query)

        if not query_tokens:
            return []

        scores = defaultdict(int)

        for token in query_tokens:
            for chunk_id in self.inverted_index.get(token, set()):
                scores[chunk_id] += 1

        results = []

        for chunk_id, score in scores.items():
            chunk = self.documents[chunk_id]

            if (
                user_id is not None
                and chunk["user_id"] != user_id
            ):
                continue

            if (
                document_id is not None
                and chunk["document_id"] != document_id
            ):
                continue

            results.append({
                "score": float(score),
                "metadata": chunk,
            })

        results.sort(
            key=lambda result: result["score"],
            reverse=True,
        )

        return results[:top_k]

    @staticmethod
    def _tokenize(text: str) -> list[str]:
        return re.findall(r"\b\w+\b", text.lower())
