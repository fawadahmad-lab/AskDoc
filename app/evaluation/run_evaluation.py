# app/evaluation/run_evaluation.py

import json
import os
from pathlib import Path

from app.evaluation.evaluator import (
    run_ragas_evaluation,
    save_evaluation_results,
    print_evaluation_results,
)
from app.rag.pipeline import run_rag_pipeline
from app.core.config import settings


# ============================================================================
# CONFIGURATION
# ============================================================================

# Overridable via env so the runner can target any indexed document.
# The IMF paper (document 23) is owned by user 13 in the vector store.
USER_ID = int(os.getenv("EVAL_USER_ID", "13"))
DOCUMENT_ID = int(os.getenv("EVAL_DOCUMENT_ID", "23"))
EVALUATION_DATA_PATH = Path("tests/evaluation/rag_eval_data.json")
OUTPUT_DIR = Path("evaluation_results")


# ============================================================================
# LOAD DATA
# ============================================================================

def load_evaluation_data():
    """Load evaluation data from JSON file."""
    if not EVALUATION_DATA_PATH.exists():
        raise FileNotFoundError(f"Data not found: {EVALUATION_DATA_PATH}")
    
    with open(EVALUATION_DATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


# ============================================================================
# BUILD RECORDS
# ============================================================================

def build_records(evaluation_data):
    """Run RAG pipeline and build evaluation records."""
    records = []

    max_samples = getattr(settings, "MAX_EVALUATION_SAMPLES", 0) or None
    data = evaluation_data if max_samples is None else evaluation_data[:max_samples]

    print(f"\n🔄 Running RAG pipeline for {len(data)} test cases...")

    for idx, item in enumerate(data, 1):
        print(f"  [{idx}] {item['question'][:50]}...")
        
        try:
            result = run_rag_pipeline(
                question=item["question"],
                user_id=USER_ID,
                document_id=DOCUMENT_ID,
            )
            
            # Extract contexts. generate_grounded_response returns the
            # retrieved chunks as `retrieved_chunks` (a list of dicts with a
            # `metadata.text` field) alongside `answer`/`citations`.
            contexts = (
                result.get("retrieved_chunks")
                or result.get("retrieved_contexts")
                or result.get("contexts")
                or []
            )
            if contexts and isinstance(contexts[0], dict):
                contexts = [
                    ctx.get("metadata", {}).get("text", str(ctx))
                    for ctx in contexts
                ]
            
            records.append({
                "question": item["question"],
                "answer": result.get("answer", ""),
                "contexts": contexts,
                "ground_truth": item.get("ground_truth") or item.get("reference", ""),
                "citations": result.get("citations", []),
            })
            
        except Exception as e:
            print(f"  ❌ Error: {e}")
            records.append({
                "question": item["question"],
                "answer": f"ERROR: {str(e)}",
                "contexts": [],
                "ground_truth": item.get("ground_truth") or item.get("reference", ""),
                "citations": [],
            })
    
    print(f"✅ Built {len(records)} records")
    return records


# ============================================================================
# MAIN FUNCTION
# ============================================================================

def main():
    """Main evaluation runner."""
    print("\n" + "=" * 60)
    print("🚀 RAG EVALUATION")
    print("=" * 60)
    
    try:
        # Load data
        evaluation_data = load_evaluation_data()
        print(f"✅ Loaded {len(evaluation_data)} test cases")
        
        # Build records
        records = build_records(evaluation_data)
        
        # Run evaluation
        model = getattr(settings, "RAGAS_EVALUATION_MODEL", "openai/gpt-oss-120b")
        print(f"\n📋 Using model: {model}")
        
        result = run_ragas_evaluation(
            evaluation_data=records,
            model=model,
            verbose=True,
        )
        
        # Print results
        print_evaluation_results(result, show_details=True)
        
        # Save results
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        metrics = save_evaluation_results(
            result,
            output_path=str(OUTPUT_DIR / "ragas_metrics.json"),
            include_details=True,
        )
        
        print("\n" + "=" * 60)
        print("✅ COMPLETE!")
        print(f"📁 Results: {OUTPUT_DIR}/")
        print(f"📊 Overall Score: {metrics.get('overall_score', 0):.2%}")
        
    except FileNotFoundError as e:
        print(f"\n❌ Error: {e}")
        print(f"\nPlease create: {EVALUATION_DATA_PATH}")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()