"""FastAPI application factory."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from app.api import api_router
from app.core.config import settings
from app.observability.langfuse import flush_langfuse


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    # Flush any buffered Langfuse traces before the process exits.
    flush_langfuse()


def create_app() -> FastAPI:
    app = FastAPI(
        title="Document RAG API",
        version="1.0.0",
        lifespan=lifespan,
    )

    # Reject requests whose Host header is not in the allowlist before they
    # reach any handler (protection against Host-header poisoning / DNS
    # rebinding). "*" would disable the check; we ship an explicit allowlist.
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.TRUSTED_HOSTS,
    )

    # Restrict browser cross-origin access to the configured frontend origin(s)
    # (e.g. the Vercel app). Explicit origins + allow_credentials=True:
    # never use "*" with credentials.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router)
    return app


app = create_app()