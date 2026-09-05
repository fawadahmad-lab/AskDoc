# app/evaluation/evaluator.py

import json
from typing import Any, Optional, List, Dict
from pathlib import Path
from datetime import datetime

# nest_asyncio is NOT applied globally here. If we patch the event loop at
# import time, asyncio.run() creates a nest_asyncio-patched loop whose task
# tracking breaks Python 3.14's asyncio.wait_for ("Timeout should be used
# inside a task") when ragas evaluates asynchronously. ragas applies
# nest_asyncio itself only when nested inside a running loop (e.g. Jupyter).

from datasets import Dataset
from ragas import evaluate
from ragas.metrics import (
    answer_relevancy,
    answer_correctness,
    answer_similarity,
    faithfulness,
)
from ragas.llms import LangchainLLMWrapper
from ragas.embeddings import LangchainEmbeddingsWrapper
from ragas.run_config import RunConfig
from langchain_community.embeddings import (
    HuggingFaceEmbeddings as LangchainHuggingFaceEmbeddings,
)
from langchain_groq import ChatGroq

from app.core.config import settings


# Non-metric columns in the ragas result dataframe. ragas names these fields
# "user_input"/"retrieved_contexts"/"response"/"reference" (not question/
# contexts/answer/ground_truth). Used to separate metric scores from the raw
# record fields when aggregating/printing results.
NON_METRIC_COLUMNS = {
    "question",
    "user_input",
    "answer",
    "response",
    "contexts",
    "retrieved_contexts",
    "ground_truth",
    "reference",
    "citations",
}


# ============================================================================
# GROQ LLM CONFIGURATION
# ============================================================================

def _ragas_finished(response) -> bool:
    """Lenient finish check for Groq.

    ragas's default parser rejects some `finish_reason` values (>1 token stop,
    `tool_calls`, etc.) and raises `LLMDidNotFinishException` spuriously. With
    a generous max_tokens the generation is usable, so accept any response.
    """
    return True


def get_groq_llm(
    model: Optional[str] = None,
    temperature: float = 0.0,
) -> LangchainLLMWrapper:
    """Initialize Groq LLM for RAGAS evaluation."""
    if model is None:
        model = getattr(settings, "RAGAS_EVALUATION_MODEL", "openai/gpt-oss-120b")
    
    print(f"📋 Initializing Groq LLM with model: {model}")
    
    api_key = getattr(settings, "GROQ_API_KEY", None)
    if not api_key:
        raise ValueError("GROQ_API_KEY not found in settings")
    
    try:
        llm = ChatGroq(
            model=model,
            temperature=temperature,
            api_key=api_key,
            max_tokens=8192,
        )
        print(f"✅ Initialized Groq LLM with model: {model}")
        return LangchainLLMWrapper(
            llm,
            bypass_n=True,
            is_finished_parser=_ragas_finished,
        )
    except Exception as e:
        print(f"❌ Error initializing Groq LLM: {e}")
        raise


# ============================================================================
# EVALUATION FUNCTIONS
# ============================================================================

def run_ragas_evaluation(
    evaluation_data: list[dict[str, Any]],
    metrics: Optional[List] = None,
    model: Optional[str] = None,
    embeddings=None,
    run_config: Optional[RunConfig] = None,
    verbose: bool = True,
):
    """Run RAGAS evaluation using Groq API as the judge LLM."""

    # Sensible defaults when evaluating via a hosted LLM: keep concurrency
    # modest to avoid Groq rate limits and raise the per-call timeout so heavy
    # structured-generation metrics (e.g. answer_correctness) can finish.
    if run_config is None:
        run_config = RunConfig(
            timeout=600,
            max_workers=2,
            max_retries=8,
        )
    
    # Validate input
    if not evaluation_data:
        raise ValueError("evaluation_data cannot be empty")

    required_fields = {"question", "answer", "contexts", "ground_truth"}

    for index, item in enumerate(evaluation_data):
        missing = required_fields - item.keys()
        if missing:
            raise ValueError(
                f"Evaluation item {index} is missing fields: "
                f"{', '.join(sorted(missing))}"
            )

        if not isinstance(item["contexts"], list):
            raise ValueError(
                f"Evaluation item {index}: contexts must be a list"
            )

        if not item["contexts"] and verbose:
            print(f"⚠️ Warning: Item {index} has empty contexts")

    if verbose:
        print(f"📊 Loaded {len(evaluation_data)} test cases")

    # Initialize Groq LLM
    llm = get_groq_llm(model=model)

    # Embeddings for similarity/relevancy metrics. Defaults to a local
    # sentence-transformers model (weights already cached by the app) so no
    # external embedding API key is required.
    if embeddings is None:
        embeddings = LangchainEmbeddingsWrapper(
            LangchainHuggingFaceEmbeddings(
                model_name="all-MiniLM-L6-v2",
            )
        )

    # Default metrics
    if metrics is None:
        metrics = [
            answer_relevancy,
            answer_correctness,
            answer_similarity,
            faithfulness,
        ]

    if verbose:
        print(f"📋 Metrics: {[m.name for m in metrics]}")

    # Convert to Dataset
    dataset = Dataset.from_list(evaluation_data)

    # Run evaluation
    if verbose:
        print("🔄 Running evaluation...")

    try:
        # Use evaluate without is_async parameter
        result = evaluate(
            dataset=dataset,
            metrics=metrics,
            llm=llm,
            embeddings=embeddings,
            run_config=run_config,
            raise_exceptions=True,
        )

        if verbose:
            print("✅ Evaluation completed successfully!")

        return result

    except Exception as e:
        print(f"❌ Evaluation failed: {e}")
        raise


# ============================================================================
# SAVE RESULTS
# ============================================================================

def save_evaluation_results(
    result,
    output_path: str = "reports/ragas_metrics.json",
    include_details: bool = False,
) -> Dict[str, Any]:
    """Save RAGAS metrics as JSON."""
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    dataframe = result.to_pandas()

    metrics = {}
    per_question = []

    for column in dataframe.columns:
        if column in NON_METRIC_COLUMNS:
            continue

        try:
            avg_score = float(dataframe[column].mean())
            metrics[column] = round(avg_score, 4)
        except (TypeError, ValueError):
            pass

    if metrics:
        metrics["overall_score"] = round(
            sum(metrics.values()) / len(metrics), 4
        )

    if include_details:
        for idx, row in dataframe.iterrows():
            question_data = {
                "question": row.get("user_input", row.get("question", "")),
                "generated_answer": row.get("response", row.get("answer", "")),
                "reference_answer": row.get("reference", row.get("ground_truth", "")),
                "retrieved_contexts": row.get(
                    "retrieved_contexts", row.get("contexts", [])
                ),
                "citations": row.get("citations", []),
                "metrics": {}
            }
            for col in dataframe.columns:
                if col in NON_METRIC_COLUMNS:
                    continue
                try:
                    question_data["metrics"][col] = float(row[col])
                except (TypeError, ValueError):
                    pass
            per_question.append(question_data)

    output = {
        "summary": metrics,
        "total_questions": len(dataframe),
        "timestamp": datetime.now().isoformat(),
    }

    if include_details:
        output["per_question"] = per_question

    with open(output_path, "w") as file:
        json.dump(output, file, indent=4)

    return metrics


# ============================================================================
# PRINT RESULTS
# ============================================================================

def print_evaluation_results(result, show_details: bool = True):
    """Print evaluation results in a readable format."""
    dataframe = result.to_pandas()

    print("\n" + "=" * 60)
    print("📊 RAGAS EVALUATION RESULTS")
    print("=" * 60)

    metrics = {}
    for column in dataframe.columns:
        if column not in NON_METRIC_COLUMNS:
            try:
                metrics[column] = float(dataframe[column].mean())
            except (TypeError, ValueError):
                pass

    print("\n📈 AVERAGE SCORES:")
    print("-" * 40)
    for metric, score in sorted(metrics.items()):
        print(f"{metric:25s}: {score:.2%}")

    if metrics:
        print("-" * 40)
        overall = sum(metrics.values()) / len(metrics)
        print(f"{'Overall Average':25s}: {overall:.2%}")

    if show_details:
        print("\n📋 PER-QUESTION RESULTS:")
        print("-" * 60)

        for idx, row in dataframe.iterrows():
            question = row.get("user_input", row.get("question", ""))
            answer = row.get("response", row.get("answer", ""))
            print(f"\nQ{idx+1}: {question}")

            for col in dataframe.columns:
                if col not in NON_METRIC_COLUMNS:
                    try:
                        score = float(row[col])
                        print(f"   {col:20s}: {score:.2%}")
                    except (TypeError, ValueError):
                        pass

            if len(answer) > 100:
                answer = answer[:100] + "..."
            print(f"   {'Answer':20s}: {answer}")

    print("\n" + "=" * 60)
