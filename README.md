# AskDocs

**Ask questions about your documents and get grounded, page-cited answers.**

AskDocs is a full-stack Retrieval-Augmented Generation (RAG) application. Upload a PDF, ask a question in natural language, and get an answer generated strictly from the document's content — with citations pointing back to the exact page it came from.

![Python](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi&logoColor=white)
![Next.js](https://img.shields.io/badge/Frontend-Next.js-000000?logo=next.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/DB-PostgreSQL-336791?logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Cache-Redis-DC382D?logo=redis&logoColor=white)
![ChromaDB](https://img.shields.io/badge/Vector%20Store-ChromaDB-6E56CF)
![Status](https://img.shields.io/badge/Status-Local%20Dev-yellow)

---

## Overview

Most chat-with-your-PDF tools either hallucinate answers or return generic summaries with no way to verify where the information came from. AskDocs is built around **grounding and auditability**: every answer is generated only from retrieved document chunks, and every response carries the page number(s) it was derived from.

The system is split into two pipelines — **ingestion** (get a document ready to be searched) and **query** (turn a question into a cited answer) — sitting behind a secure, cookie-based auth layer.

## Architecture

```mermaid
flowchart LR
    subgraph Client["Browser"]
        UI["Next.js UI"]
    end
    subgraph BFF["Next.js Route Handlers (BFF)"]
        RH["Server-side API Proxy<br/>httpOnly cookie auth"]
    end
    subgraph Backend["FastAPI Backend"]
        Auth["/auth"]
        ChatAPI["/chat"]
        DocAPI["/documents"]
        ConvAPI["/conversations"]
    end
    subgraph Data["Data Layer"]
        PG[("PostgreSQL")]
        Redis[("Redis Cache")]
        Chroma[("ChromaDB")]
    end

    UI --> RH
    RH --> Auth
    RH --> ChatAPI
    RH --> DocAPI
    RH --> ConvAPI
    ChatAPI --> Redis
    ChatAPI --> Chroma
    ChatAPI --> PG
    DocAPI --> PG
    ConvAPI --> PG
```

The browser never talks to the backend directly. Next.js Route Handlers act as a **Backend-for-Frontend (BFF)**: the JWT issued at login is stored in an `httpOnly`, `Secure` cookie and attached server-side on every proxied request. This removes the token from client-accessible JavaScript entirely and avoids the need for CORS.

### Ingestion pipeline

```mermaid
flowchart LR
    A[PDF Upload] --> B[Extract text per page]
    B --> C[Chunk text<br/>tagged with user_id + document_id]
    C --> D[Embed chunks<br/>MiniLM, 384-dim, L2-normalized]
    D --> E[Index into ChromaDB<br/>persistent collection]
```

Each chunk is tagged with `user_id` and `document_id` at index time, which becomes the tenant-isolation boundary at query time.

### Query pipeline

```mermaid
flowchart LR
    Q[User question] --> Cache{Redis cache hit?}
    Cache -- yes --> R[Return cached answer]
    Cache -- no --> Embed[Embed question]
    Embed --> Retrieve["Vector search (top 10)<br/>filtered by user_id / document_id"]
    Retrieve --> Rerank["Cross-encoder rerank<br/>(top 5)"]
    Rerank --> Gen["Grounded generation<br/>via LLM, context-only prompt"]
    Gen --> Cite[Extract page-level citations]
    Cite --> Persist[Persist Q&A to conversation]
```

**Why retrieve → rerank → generate:** vector search alone is fast but imprecise; a cross-encoder reranker re-scores the top candidates against the exact question for much higher relevance before they ever reach the LLM. The generation prompt is explicitly constrained to answer *only* from the retrieved context, and to say so when the answer isn't present — this is what keeps citations meaningful instead of decorative.

## Features

- **Grounded Q&A** — answers are generated only from retrieved document content, with page-level citations attached.
- **Multi-turn conversations** — chat history is persisted per conversation (PostgreSQL) and fed back into the generation prompt for context-aware follow-ups.
- **Document library** — upload, preview, and delete PDFs independently of any conversation.
- **Response caching** — identical questions (per user, per document) are served from Redis within a short TTL, skipping the full retrieval-rerank-generate pipeline.
- **Tenant isolation** — every vector search and database query is scoped by `user_id`, enforced at the retrieval layer, not just the API layer.
- **Secure auth** — JWT issued on login, stored only in an httpOnly cookie, never exposed to client-side JavaScript.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router), Route Handlers as BFF |
| Backend | FastAPI, Python |
| Relational DB | PostgreSQL (users, documents, conversations, messages) |
| Vector Store | ChromaDB (persistent collection) |
| Cache | Redis (response caching, SHA-256 keyed, TTL-based) |
| Embeddings | `sentence-transformers/all-MiniLM-L6-v2` |
| Reranking | `cross-encoder/ms-marco-MiniLM-L-6-v2` |
| LLM | Groq (`openai/gpt-oss-20b`) |
| Auth | JWT via httpOnly cookies (form-urlencoded login) |

## Getting Started

> Adjust environment variable names and commands below to match your local `.env` and scripts.

```bash
# clone
git clone https://github.com/<your-username>/askdocs.git
cd askdocs

# backend
cd backend
pip install -r requirements.txt
alembic upgrade head
uvicorn main:app --reload

# frontend
cd ../frontend
npm install
npm run dev
```

Required environment variables typically include a Postgres connection string, a Redis URL, a Groq API key, and a JWT signing secret — see `.env.example` in each service.

## Project Structure

```
backend/
  main.py            # FastAPI app, route definitions
  models.py          # SQLAlchemy models (User, Document, Conversation, Message)
  schemas.py         # Pydantic request/response schemas
  ai/
    embeddings.py     # MiniLM embedding generation
    retrieval.py      # Chroma indexing + vector search
    reranker.py       # Cross-encoder reranking
    generation.py     # Prompt construction + grounded generation
    llm_client.py     # Groq client
    cache.py          # Redis response cache
    conversation.py   # Conversation/message persistence
  services/
    pdf_service.py    # PDF text extraction
    chunker.py        # Text chunking

frontend/
  app/
    api/               # Next.js Route Handlers (BFF layer)
    chat/              # Chat UI, sidebar, document library
  lib/
    api.ts             # Typed API client
```

## Roadmap

- [ ] Deploy backend + frontend (currently local-only)
- [ ] Streaming responses (SSE) instead of single-shot JSON replies
- [ ] Cross-document question answering
- [ ] Automated eval suite for citation accuracy at scale

## License

MIT — see [LICENSE](LICENSE) for details.
