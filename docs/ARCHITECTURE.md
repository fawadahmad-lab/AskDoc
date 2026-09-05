# Architecture

This document describes the architecture of the project: a **multi-tenant Document
RAG (Retrieval-Augmented Generation) application** with a **full-stack** FastAPI +
Next.js codebase and a separate **RAGAS evaluation harness** used to measure answer
quality.

Two models power the system (both served via Groq):

| Model setting | Model | Role |
|---|---|---|
| `GROQ_MODEL` | `openai/gpt-oss-20b` | RAG **generation** — produces the grounded answer |
| `RAGAS_EVALUATION_MODEL` | `openai/gpt-oss-120b` | RAGAS **judge** — scores answers offline |

---

## High-level architecture

```mermaid
flowchart TB
    subgraph Client["🖥️ Client"]
        FE["Next.js Frontend<br/>(React / App Router)<br/>login · signup · chat ·<br/>document upload"]
    end

    subgraph API["🧩 FastAPI Backend"]
        direction TB
        ROUTES["API Routes<br/>auth · documents ·<br/>conversations · chat · health"]
        AUTH["Auth / JWT<br/>OAuth2 bearer · get_current_user"]
        SCHEMA["Pydantic Schemas"]
    end

    subgraph DATA["🗄️ Data Layer"]
        direction TB
        PG["PostgreSQL 16<br/>users · documents<br/>conversations · messages"]
        REDIS["Redis 7<br/>AI response cache<br/>TTL = 300s"]
        CHROMA["ChromaDB<br/>document_chunks vector store<br/>scoped by user_id / document_id"]
        FS["File Storage<br/>uploads/ (PDFs)"]
    end

    subgraph INGEST["📄 Document Ingestion Pipeline"]
        PDF["extract_pdf_text<br/>(pdf_service)"]
        CHUNK["RecursiveCharacterTextSplitter<br/>chunk_size 800 · overlap 120"]
        EMBED["Embeddings<br/>all-MiniLM-L6-v2<br/>(local sentence-transformers)"]
        INDEX["index_chunks → vector_store.add"]
    end

    subgraph RAG["🧠 RAG Pipeline (run_rag_pipeline)"]
        direction TB
        RET["Retrieval<br/>search_chunks top_k=10<br/>(cosine · user/doc filter)"]
        RERANK["Rerank<br/>cross-encoder ms-marco<br/>keep top_k=3"]
        GEN["Generation<br/>grounded prompt · citations<br/>refuses if not in docs"]
        LLM["LLM (Groq)<br/>GROQ_MODEL = qwen/qwen3.6-27b"]
    end

    subgraph EVAL["📊 RAGAS Evaluation Harness"]
        direction TB
        EVALDATA["tests/evaluation/rag_eval_data.json<br/>(16 eval questions)"]
        BUILDREC["build_records()<br/>run RAG pipeline per question"]
        EVALUATE["evaluate()<br/>Dataset.from_list"]
        JUDGE["Judge LLM (Groq)<br/>RAGAS_EVALUATION_MODEL =<br/>openai/gpt-oss-120b<br/>relevancy · correctness ·<br/>similarity · faithfulness"]
        REPORT["evaluation_results/<br/>ragas_metrics.json<br/>(summary + per-question audit)"]
    end

    subgraph OBS["📈 Observability"]
        LANG["Langfuse<br/>traces: pipeline · retrieval ·<br/>rerank · generation · llm-output"]
    end

    %% Client → API
    FE -- "HTTPS / REST (Next API routes)" --> ROUTES
    ROUTES --> AUTH
    AUTH --> SCHEMA

    %% API → Data
    ROUTES -- "SQLAlchemy ORM" --> PG
    ROUTES -- "redis client" --> REDIS
    ROUTES -- "file storage" --> FS

    %% API → Ingestion
    ROUTES -- "documents/upload" --> PDF
    PDF --> CHUNK
    CHUNK --> EMBED
    EMBED --> INDEX
    INDEX --> CHROMA

    %% API → RAG (chat)
    ROUTES -- "chat request + history" --> RAG
    RET --> RERANK --> GEN --> LLM
    RET -- "query embedding" --> EMBED
    RET -- "search top-k vectors" --> CHROMA
    GEN -- "answer + citations" --> ROUTES
    ROUTES -- "cache answer" --> REDIS
    ROUTES -- "save message" --> PG

    %% RAG → Observability
    RAG -- "spans" --> LANG
    INGEST -- "spans" --> LANG

    %% Evaluation (offline, separate runner)
    EVALDATA --> BUILDREC
    BUILDREC -- "run_rag_pipeline" --> RAG
    BUILDREC --> EVALUATE
    EVALUATE --> JUDGE
    EVALUATE --> REPORT
    EVAL -- "spans" --> LANG

    %% Styling
    classDef cli fill:#fff3e0,stroke:#ff9800
    classDef data fill:#e3f2fd,stroke:#1976d2
    classDef rag fill:#e8f5e9,stroke:#43a047
    classDef eval fill:#f3e5f5,stroke:#8e24aa
    class FE cli
    class PG,REDIS,CHROMA,FS data
    class RAG,LLM rag
    class EVAL,JUDGE eval
```

---

## Components

### Infrastructure
- **Docker Compose**: three services — `api` (FastAPI), `postgres:16`, `redis:7`.
  The API runs in a container (`Dockerfile`) or locally via `venv`.
- **Configuration**: centralised in `app/core/config.py`, loaded from `.env` /
  `.env.example`.

### Full-stack / software engineering

| Concern | Implementation |
|---|---|
| User management & auth | JWT (OAuth2 bearer via `jose`), password hashing (`pwdlib`), `get_current_user` dependency, per-user row scoping throughout |
| Database | PostgreSQL 16 via SQLAlchemy ORM + Alembic migrations; tables `users`, `documents`, `conversations`, `messages` |
| Data access | Repositories in `app/db/repos/` (`user`, `document`, `conversation`) |
| Caching | Redis — deterministic SHA-256 cache key over `user_id:document_id:question`, TTL 300s, refusal-citation guard |
| Chat history | `messages` rows; the last 5 Q/A pairs injected into the RAG prompt as context |
| API / validation | FastAPI routers + Pydantic schemas (`app/api/routes/`, `app/schemas/`) |
| File storage | PDFs stored under `uploads/`, metadata (path/filename/owner) in PostgreSQL |

### AI / RAG pipeline

| Step | Implementation |
|---|---|
| Ingest | PDF → text (`pdf_service`) → chunks (`RecursiveCharacterTextSplitter`, size 800 / overlap 120) → embeddings (`all-MiniLM-L6-v2`, local) → index into ChromaDB |
| Retrieve | `search_chunks` — top-10, cosine similarity, scoped by `user_id` (and optional `document_id`) |
| Rerank | Cross-encoder (`cross-encoder/ms-marco-MiniLM-L-6-v2`) re-scores and keeps the top-3 chunks |
| Generate | Grounded prompt from retrieved chunks only, returns **citations** (document_id + page_number), refuses when the answer is not in the document; model = `GROQ_MODEL` (qwen/qwen3.6-27b) |
| Trace | Every stage emits a Langfuse span (latency, retrieved pages, citation count, etc.) |

### Evaluation harness (offline)

| Step | Implementation |
|---|---|
| Data | `tests/evaluation/rag_eval_data.json` — eval questions with ground-truth answers |
| Build records | `build_records()` runs the **live** RAG pipeline per question to capture `answer`, `contexts`, and `citations` |
| Score | `evaluate()` converts records to a HuggingFace `Dataset` and runs RAGAS metrics |
| Judge | `openai/gpt-oss-120b` (`RAGAS_EVALUATION_MODEL`) scores: `answer_relevancy`, `answer_correctness`, `answer_similarity`, `faithfulness` |
| Report | `evaluation_results/ragas_metrics.json` — overall summary + per-question audit (question, generated_answer, reference_answer, retrieved_contexts, citations, metrics) |

---

## Request flows (sequence)

### Flow 1 — Chat / question-answering

```mermaid
sequenceDiagram
    participant FE as Next.js Frontend
    participant API as FastAPI /chat
    participant AUTH as JWT Auth
    participant HS as History Store (Postgres)
    participant CACHE as Redis Cache
    participant RAG as run_rag_pipeline
    participant VEC as ChromaDB
    participant LLM as LLM (openai/gpt-oss-20b)
    participant LF as Langfuse

    FE->>API: POST /chat {question, document_id?, conversation_id?}
    API->>AUTH: validate bearer token → user
    API->>HS: resolve/create conversation (ownership check)
    API->>HS: save user message
    API->>CACHE: get_cached_response(key)
    alt cache hit
        CACHE-->>API: cached answer (strip citations if refusal)
        API->>HS: save assistant message
        API-->>FE: cached response
    else cache miss
        API->>HS: load last 5 Q/A history
        API->>RAG: run_rag_pipeline(question, user_id, document_id, history)
        RAG->>VEC: embed query + search top-10 (user/doc filter)
        RAG->>RAG: rerank to top-3 (cross-encoder)
        RAG->>LLM: grounded prompt → answer
        LLM-->>RAG: answer (+ citations, groundedness)
        RAG-->>API: {answer, citations, citation_accuracy}
        API->>CACHE: cache_response(key)
        API->>HS: save assistant message (+ resolved document)
        API-->>FE: response
    end
    Note over RAG,LLM: every step pushes a Langfuse span
```

### Flow 2 — Document upload / indexing

```mermaid
sequenceDiagram
    participant FE as Next.js Frontend
    participant API as FastAPI /documents/upload
    participant AUTH as JWT Auth
    participant FS as File Storage
    participant DB as Postgres (documents)
    participant PDF as pdf_service
    participant CH as chunker
    participant EMB as Embeddings (MiniLM)
    participant VEC as ChromaDB

    FE->>API: POST /documents/upload (PDF)
    API->>AUTH: validate bearer token → user
    API->>FS: save upload (per-user path)
    API->>DB: create document row
    API->>PDF: extract_pdf_text(path) → pages
    PDF-->>API: [{page_number, text}]
    API->>CH: chunk_pages(pages, document_id, user_id)
    CH-->>API: chunks (text + metadata)
    API->>EMB: generate_embeddings(chunks)
    EMB-->>API: vectors
    API->>VEC: index_chunks → upsert (doc/page/chunk ids + metadata)
    API-->>FE: DocumentResponse
```

### Flow 3 — Evaluation run

```mermaid
sequenceDiagram
    participant RUN as run_evaluation.py
    participant DATA as rag_eval_data.json
    participant RAG as run_rag_pipeline
    participant EVAL as evaluator.py
    participant JUDGE as Judge (gpt-oss-120b)
    participant REPORT as ragas_metrics.json

    RUN->>DATA: load 16 evaluation questions
    loop for each question
        RUN->>RAG: run_rag_pipeline(question) → answer, contexts, citations
        RAG-->>RUN: record {question, answer, contexts, ground_truth, citations}
    end
    RUN->>EVAL: run_ragas_evaluation(records)
    EVAL->>JUDGE: score relevancy / correctness / similarity / faithfulness
    JUDGE-->>EVAL: per-metric scores
    EVAL-->>REPORT: summary + per-question audit
```

---

## How to run

```bash
# Backend (FastAPI)
uvicorn app.main:app --reload        # or: docker compose up

# Frontend (Next.js)
cd frontend && npm run dev

# Evaluation
cd ~/Projects/AI/ai-app                       # replace with repo root
MAX_EVALUATION_SAMPLES=1 ./venv/bin/python -m app.evaluation.run_evaluation   # smoke
./venv/bin/python -m app.evaluation.run_evaluation                            # full (16)
```

`MAX_EVALUATION_SAMPLES` (0 = all questions) can be overridden from the shell, taking
precedence over the `.env` value.
