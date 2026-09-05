FROM python:3.12-slim

WORKDIR /app

# Install deps first (separate layer from source so edits don't re-install).
COPY requirements.txt .
RUN pip install --no-cache-dir --default-timeout=300 -r requirements.txt

# Runtime behaviour. ENV placed after the pip layer so the heavy install layer
# stays cached across Dockerfile tweaks. HF_HOME keeps downloaded models out of
# /app so a Railway volume can persist them across redeploys.
ENV PYTHONUNBUFFERED=1
ENV HF_HOME=/root/.cache/huggingface

COPY . .

EXPOSE 8000

# Run pending alembic migrations, then serve. Railway sets $PORT at runtime;
# --proxy-headers lets uvicorn read client IPs (used by rate limiting) behind
# Railway's reverse proxy.
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips='*'"]