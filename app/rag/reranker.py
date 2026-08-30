"""Cross-encoder reranker for retrieved chunks."""

from sentence_transformers import CrossEncoder

from app.core.config import settings


class Reranker:
    def __init__(self):
        self.model = CrossEncoder(settings.RERANKER_MODEL)

    def rerank(
        self,
        query: str,
        results: list[dict],
        top_k: int = 5,
    ) -> list[dict]:
        if not results:
            return []

        pairs = [
            (
                query,
                result["metadata"]["text"],
            )
            for result in results
        ]

        scores = self.model.predict(pairs)

        reranked_results = []

        for result, score in zip(results, scores):
            reranked_results.append({
                "score": float(score),
                "metadata": result["metadata"],
            })

        reranked_results.sort(
            key=lambda result: result["score"],
            reverse=True,
        )

        return reranked_results[:top_k]
