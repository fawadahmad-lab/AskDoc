# Document RAG API

A multi-tenant **Document Q&A** application: upload a PDF, ask questions, and get
answers grounded only in your own documents — with page citations.

- **Backend**: FastAPI + SQLAlchemy (PostgreSQL) + Redis + ChromaDB
- **AI**: Retrieval-Augmented Generation (retrieval → cross-encoder rerank → grounded LLM generation)
- **Frontend**: Next.js / React
- **Evaluation**: RAGAS harness with a separate judge model
- **Observability**: Langfuse tracing

## Highlight features

- 🔐 Multi-tenant auth (JWT) — users only ever see their own docs, conversations, and messages
- 📄 PDF ingestion: extract → chunk → embed → index into a per-user vector store
- 🧠 Grounded answers with **citations** to source pages; refuses out-of-domain questions
- ⚡ Redis-cached AI responses (deterministic key, TTL)
- 💬 Chat history (last 5 turns) injected into the prompt
- 📊 RAGAS evaluation: relevancy, correctness, similarity, faithfulness — with per-question audit
- 📈 Langfuse traces for every pipeline stage

## Architecture

See **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** for the full architecture diagram
and request-flow sequence diagrams (RAG pipeline, evaluation harness, and full-stack
data layer).

Two Groq-hosted models power the system:

| Setting | Model | Role |
|---|---|---|
| `GROQ_MODEL` | `openai/gpt-oss-20b` | RAG generation (produces answers) |
| `RAGAS_EVALUATION_MODEL` | `openai/gpt-oss-120b` | RAGAS judge (scores answers offline) |

## Quick start

```bash
# 1) Configure secrets (never commit .env*)
cp .env.example .env           # edit with your local creds
# Local docker: also create .env.docker (see docker-compose.yml) — gitignored

# 2) Backend (local: Postgres on :5433, Redis on :6379)
docker compose up --build      # runs alembic migrations + uvicorn :8000
# or, without Docker:
uvicorn app.main:app --reload  # requires local Postgres/Redis

# 3) Frontend
cd frontend && cp .env.example .env.local   # BACKEND_URL=http://localhost:8000
npm install && npm run dev
```

## Deployment

Production topology: **Vercel** (Next.js) → **Railway** (FastAPI, migrations,
ChromaDB) with **Supabase** Postgres and a managed **Redis** (Railway plugin or
Upstash). No web servers to operate yourself — the BFF runs inside Next.js, so the
browser only ever talks to one origin.

### 1. Supabase (database)
1. Create a project; open **Project Settings → Database**.
2. Copy the **Session pooler** connection string (port 5432) — this is `DATABASE_URL`.
3. Leave the schema to the app: migrations run automatically on Railway boot.

### 2. Railway (backend)
1. Create a project → **Deploy from GitHub repo** (the `Dockerfile` is detected) OR
   deploy the `ghcr.io` image CI already pushes.
2. Add a **Volume** and mount it at `/app/chroma_db` (embeddings/vector store)
   and `/app/uploads` (uploaded PDFs).
3. Add a **Redis** plugin and copy its URL.
4. Set these **Variables** (all gitignored secrets MUST be entered here):

   | Variable | Value |
   |---|---|
   | `ENVIRONMENT` | `production` |
   | `DATABASE_URL` | Supabase Session pooler string |
   | `REDIS_URL` | Railway Redis plugin URL |
   | `SECRET_KEY` | `python -c "import secrets; print(secrets.token_urlsafe(32))"` |
   | `ENCRYPTION_KEY` | `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` |
   | `FRONTEND_URL` | `https://<your-app>.vercel.app` |
   | `CORS_ORIGINS` | `https://<your-app>.vercel.app` |
   | `TRUSTED_HOSTS` | `<your-app>.up.railway.app` (+ custom domain) |
   | `EMAIL_SMTP_USER` / `EMAIL_SMTP_PASSWORD` | Gmail + App Password (required: verify/reset emails) |
   | `GROQ_API_KEY` | optional, dev/eval fallback only |
   | `ALLOWED_EMAIL_DOMAINS` | e.g. `gmail.com` |

   Healthcheck is configured via `railway.json` (`/health`); startup runs
   `alembic upgrade head` before serving, and Uvicorn honors Railway's `PORT`.
   Client IPs for rate limiting are read through Railway's proxy
   (`--proxy-headers`).

### 3. Vercel (frontend)
1. Import the `frontend/` directory as a Next.js project.
2. Add one **Environment Variable**: `BACKEND_URL` → your Railway URL
   (`https://<your-app>.up.railway.app`). It's read server-side only — never
   `NEXT_PUBLIC_*`.
3. Deploy. CI (`ci.yml`) already fails on lint/type errors; type-check + build
   run on every push.

## Evaluation

```bash
MAX_EVALUATION_SAMPLES=1 ./venv/bin/python -m app.evaluation.run_evaluation   # smoke
./venv/bin/python -m app.evaluation.run_evaluation                            # full run
```

Results are written to `evaluation_results/ragas_metrics.json` (summary + per-question audit).
`MAX_EVALUATION_SAMPLES` (0 = all) is overridable from the shell and takes precedence over `.env`.
