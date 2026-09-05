"""RAG chat route."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.cache import (
    build_cache_key,
    get_cached_response,
    cache_response,
)
from app.core.deps import get_current_user
from app.db.base import get_db
from app.db import models
from app.db.repos import conversation as conversation_repo
from app.db.repos import user as user_repo
from app.rag import run_rag_pipeline
from app.rag.generation import is_refusal_answer
from app.schemas import ChatRequest, ChatResponse

router = APIRouter(prefix="/chat", tags=["chat"])


def _strip_citations_on_refusal(response: dict) -> dict:
    """Ensure a refusal answer never carries citations.

    Guards against stale cached responses (cached before refusals returned
    empty citations) leaking source pages on out-of-domain questions.
    """
    if is_refusal_answer(response.get("answer", "")):
        response["citations"] = []
    return response


@router.post("", response_model=ChatResponse)
def chat(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Ask questions about the authenticated user's documents.

    If `conversation_id` is omitted a new conversation is created
    automatically. The user's question and the assistant's answer are
    persisted to the active conversation.
    """
    groq_api_key = user_repo.get_user_groq_key(db, current_user)
    if not groq_api_key:
        raise HTTPException(
            status_code=400,
            detail=(
                "No Groq API key on your account. Add one in "
                "Settings so answers can be generated."
            ),
        )

    conversation_id = request.conversation_id
    if conversation_id is None:
        title = request.question.strip()[:50]
        conversation = conversation_repo.create_conversation(
            db=db,
            user_id=current_user.id,
            title=title or "New conversation",
        )
        conversation_id = conversation.id
    else:
        # Ownership check: raises 404 if not owned by the current user.
        conversation_repo.get_conversation_or_404(
            db,
            current_user.id,
            conversation_id,
        )

    # Persist the user's question first so it shows up even if generation fails.
    conversation_repo.save_conversation_message(
        db=db,
        conversation_id=conversation_id,
        role="user",
        content=request.question,
        document_id=request.document_id,
    )

    cache_key = build_cache_key(
        user_id=current_user.id,
        question=request.question,
        document_id=request.document_id,
    )

    cached_response = get_cached_response(cache_key)

    if cached_response:
        cached_response = _strip_citations_on_refusal(cached_response)
        cached_response["cached"] = True
        cached_response["conversation_id"] = conversation_id

        conversation_repo.save_conversation_message(
            db=db,
            conversation_id=conversation_id,
            role="assistant",
            content=cached_response["answer"],
            citations=cached_response.get("citations", []),
            document_id=_assistant_document_id(
                db,
                current_user,
                request.document_id,
                cached_response.get("citations", []),
            ),
        )

        return cached_response

    # Build conversation context for the RAG prompt.
    history = conversation_repo.get_conversation_history(
        db,
        conversation_id,
    )

    response = run_rag_pipeline(
        question=request.question,
        user_id=current_user.id,
        document_id=request.document_id,
        history=history,
        groq_api_key=groq_api_key,
    )

    response = _strip_citations_on_refusal(response)

    response["cached"] = False
    response["conversation_id"] = conversation_id

    cache_response(
        cache_key=cache_key,
        response=response,
    )

    conversation_repo.save_conversation_message(
        db=db,
        conversation_id=conversation_id,
        role="assistant",
        content=response["answer"],
        citations=response.get("citations", []),
        document_id=_assistant_document_id(
            db,
            current_user,
            request.document_id,
            response.get("citations", []),
        ),
    )

    return response


def _assistant_document_id(
    db: Session,
    current_user: models.User,
    request_document_id: int | None,
    citations: list,
) -> int | None:
    """Resolve the message's document FK safely.

    Prefer the scoped request document; else the first cited document. Only
    return an id that points at a document the user actually owns, guarding
    against stale citation ids in the shared vector corpus.
    """
    candidates = [request_document_id]
    if request_document_id is None and citations:
        candidates.append(citations[0].get("document_id"))

    for candidate in candidates:
        if candidate is None:
            continue
        document = (
            db.query(models.Document)
            .filter(
                models.Document.id == candidate,
                models.Document.user_id == current_user.id,
            )
            .first()
        )
        if document is not None:
            return candidate
    return None
