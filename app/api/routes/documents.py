"""Document routes: upload, list, get, delete and file streaming."""

import os

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.base import get_db
from app.db import models
from app.db.repos import document as document_repo
from app.rag.retrieval import index_chunks, delete_chunks
from app.schemas import DocumentResponse
from app.services.pdf_service import extract_pdf_text
from app.services.chunker import chunk_pages
from app.services.file_storage import save_upload, delete_file

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload", response_model=DocumentResponse, status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Upload a PDF, extract its text, chunk it, generate embeddings and index."""
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported",
        )

    file_path = save_upload(current_user.id, file)

    document = document_repo.create_document(
        db,
        user_id=current_user.id,
        filename=file.filename,
        file_path=file_path,
    )

    pages = extract_pdf_text(file_path)

    chunks = chunk_pages(
        pages=pages,
        document_id=document.id,
        user_id=current_user.id,
    )

    index_chunks(chunks)

    return document


@router.get("", response_model=list[DocumentResponse])
def get_documents(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get all documents belonging to the authenticated user."""
    return document_repo.list_documents(db, current_user.id)


@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get a specific document owned by the current user."""
    document = document_repo.get_document(db, document_id, current_user.id)

    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")

    return document


@router.delete("/{document_id}", status_code=204)
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Delete a document along with its file, vector-index chunks, and refs."""
    document = document_repo.get_document(db, document_id, current_user.id)

    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")

    deletion_error = delete_file(document.file_path)

    document_repo.detach_messages_from_document(db, document_id)
    document_repo.delete_document(db, document)

    delete_chunks(
        document_id=document_id,
        user_id=current_user.id,
    )

    if deletion_error:
        raise HTTPException(
            status_code=500,
            detail="Document deleted but its file could not be removed",
        )

    return None


@router.get("/{document_id}/file")
def get_document_file(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Stream the stored PDF file for a document owned by the current user."""
    document = document_repo.get_document(db, document_id, current_user.id)

    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")

    if not os.path.exists(document.file_path):
        raise HTTPException(status_code=404, detail="Document file not found")

    return FileResponse(
        document.file_path,
        media_type="application/pdf",
        filename=document.filename,
    )
