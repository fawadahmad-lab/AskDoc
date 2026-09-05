# app/rag/reranker.py

"""Cross-encoder reranker for retrieved chunks."""

import time
from typing import List, Optional
from sentence_transformers import CrossEncoder
from langfuse import observe

from app.core.config import settings


_reranker: Optional["Reranker"] = None


@observe(
    name="cross-encoder-reranker",
    as_type="span",
)
def reranker() -> "Reranker":
    """Return a lazily-initialised, process-wide singleton reranker."""
    global _reranker

    if _reranker is None:
        _reranker = Reranker()

    return _reranker


class Reranker:
    def __init__(self):
        self.model = CrossEncoder(settings.RERANKER_MODEL)
        self.model_name = settings.RERANKER_MODEL

    @observe(
        name="rerank-chunks",
        as_type="retriever",
        capture_input=True,
        capture_output=True,
    )
    def rerank(
        self,
        query: str,
        results: List[dict],
        top_k: int = 5,
    ) -> List[dict]:
        """Rerank retrieved chunks using cross-encoder."""
        if not results:
            return []

        start_time = time.perf_counter()

        pairs = [
            (query, result["metadata"]["text"])
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

        latency_ms = (time.perf_counter() - start_time) * 1000

        # Add metadata to current span if available
        try:
            from langfuse import get_client
            langfuse = get_client()
            if hasattr(langfuse, "get_current_span"):
                current_span = langfuse.get_current_span()
                if current_span:
                    scores_list = [r["score"] for r in reranked_results]
                    current_span.update(
                        metadata={
                            "input_chunks": len(results),
                            "output_chunks": min(top_k, len(reranked_results)),
                            "latency_ms": round(latency_ms, 2),
                            "top_score": scores_list[0] if scores_list else 0,
                            "model": self.model_name,
                        }
                    )
        except Exception:
            pass

        return reranked_results[:top_k]
