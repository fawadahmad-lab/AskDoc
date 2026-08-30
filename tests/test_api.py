from dotenv import load_dotenv
load_dotenv(".env.test")

import uuid

from fastapi.testclient import TestClient
from app.main import app
from app.cache.redis import redis_client

client = TestClient(app)


def create_user_and_token():
    """Create a unique user and return (user_id, username, token)."""
    unique_id = uuid.uuid4().hex[:8]
    username = f"conv_user_{unique_id}"
    email = f"conv_{unique_id}@example.com"
    password = "testpassword123"

    signup_response = client.post(
        "/auth/signup",
        json={
            "email": email,
            "username": username,
            "password": password,
        },
    )
    assert signup_response.status_code == 201
    user = signup_response.json()
    user_id = user["id"]

    login_response = client.post(
        "/auth/login",
        data={"username": username, "password": password},
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]

    return {"id": user_id, "token": token}


def test_get_conversations_without_authentication():
    response = client.get("/conversations")

    assert response.status_code == 401


def test_auth_me():
    user = create_user_and_token()

    response = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {user['token']}"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == user["id"]
    assert "email" in body
    assert "username" in body
    assert "hashed_password" not in body


def test_auth_me_without_token():
    response = client.get("/auth/me")

    assert response.status_code == 401


def test_conversations_list_and_create():
    user = create_user_and_token()
    headers = {"Authorization": f"Bearer {user['token']}"}

    # Starts empty
    response = client.get("/conversations", headers=headers)
    assert response.status_code == 200
    assert response.json() == []

    # Create an empty conversation with a title
    response = client.post(
        "/conversations",
        json={"title": "My first chat"},
        headers=headers,
    )
    assert response.status_code == 201
    conversation = response.json()
    assert conversation["title"] == "My first chat"
    assert "id" in conversation

    # Now listed
    response = client.get("/conversations", headers=headers)
    assert response.status_code == 200
    assert any(c["id"] == conversation["id"] for c in response.json())


def test_conversation_detail_and_delete():
    user = create_user_and_token()
    headers = {"Authorization": f"Bearer {user['token']}"}

    response = client.post(
        "/conversations",
        json={"title": "To delete"},
        headers=headers,
    )
    conversation_id = response.json()["id"]

    # Detail with no messages
    response = client.get(
        f"/conversations/{conversation_id}",
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["messages"] == []

    # Delete
    response = client.delete(
        f"/conversations/{conversation_id}",
        headers=headers,
    )
    assert response.status_code == 204

    # Gone
    response = client.get(
        f"/conversations/{conversation_id}",
        headers=headers,
    )
    assert response.status_code == 404


def test_conversation_scoped_to_user():
    user_a = create_user_and_token()
    user_b = create_user_and_token()

    response = client.post(
        "/conversations",
        json={"title": "A's conversation"},
        headers={"Authorization": f"Bearer {user_a['token']}"},
    )
    conversation_id = response.json()["id"]

    # User B cannot read or delete user A's conversation
    for method in ("get", "delete"):
        response = client.request(
            method,
            f"/conversations/{conversation_id}",
            headers={"Authorization": f"Bearer {user_b['token']}"},
        )
        assert response.status_code == 404


def test_chat_auto_creates_conversation_and_records_messages():
    user = create_user_and_token()
    headers = {"Authorization": f"Bearer {user['token']}"}

    # No conversation_id -> auto-created.
    response = client.post(
        "/chat",
        json={"question": "Hello there"},
        headers=headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert "answer" in body
    assert body["conversation_id"] is not None

    conversation_id = body["conversation_id"]

    # Conversation was persisted with a title based on the question.
    detail = client.get(
        f"/conversations/{conversation_id}",
        headers=headers,
    ).json()
    assert detail["title"].startswith("Hello there")

    # Records the user question and the assistant answer.
    roles = [m["role"] for m in detail["messages"]]
    assert "user" in roles
    assert "assistant" in roles
    user_msg = next(m for m in detail["messages"] if m["role"] == "user")
    assert user_msg["content"] == "Hello there"


def test_chat_uses_provided_conversation_id():
    user = create_user_and_token()
    headers = {"Authorization": f"Bearer {user['token']}"}

    conversation_id = client.post(
        "/conversations",
        json={"title": "Existing chat"},
        headers=headers,
    ).json()["id"]

    response = client.post(
        "/chat",
        json={"question": "Follow up question", "conversation_id": conversation_id},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["conversation_id"] == conversation_id

    detail = client.get(
        f"/conversations/{conversation_id}",
        headers=headers,
    ).json()
    assert len(detail["messages"]) == 2


def test_chat_rejects_conversation_not_owned():
    user_a = create_user_and_token()
    user_b = create_user_and_token()

    conversation_id = client.post(
        "/conversations",
        json={"title": "A's chat"},
        headers={"Authorization": f"Bearer {user_a['token']}"},
    ).json()["id"]

    response = client.post(
        "/chat",
        json={"question": "prying?", "conversation_id": conversation_id},
        headers={"Authorization": f"Bearer {user_b['token']}"},
    )
    assert response.status_code == 404


def _sample_pdf_bytes():
    """A tiny, valid single-page PDF."""
    return (
        b"%PDF-1.4\n"
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        b"/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n"
        b"4 0 obj\n<< /Length 44 >>\nstream\nBT /F1 24 Tf 72 720 Td "
        b"(AskDocs sample document) Tj ET\nendstream\nendobj\n"
        b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n"
        b"xref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n"
        b"0000000058 00000 n \n0000000115 00000 n \n0000000247 00000 n \n"
        b"0000000351 00000 n \ntrailer\n<< /Size 6 /Root 1 0 R >>\n"
        b"startxref\n444\n%%EOF\n"
    )


def test_conversation_rename():
    user = create_user_and_token()
    headers = {"Authorization": f"Bearer {user['token']}"}

    conversation_id = client.post(
        "/conversations",
        json={"title": "Old title"},
        headers=headers,
    ).json()["id"]

    response = client.patch(
        f"/conversations/{conversation_id}",
        json={"title": "New title"},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["title"] == "New title"

    detail = client.get(
        f"/conversations/{conversation_id}",
        headers=headers,
    ).json()
    assert detail["title"] == "New title"


def test_document_upload_file_and_delete():
    from app.rag.retrieval import vector_store

    user = create_user_and_token()
    headers = {"Authorization": f"Bearer {user['token']}"}

    upload = client.post(
        "/documents/upload",
        files={"file": ("sample.pdf", _sample_pdf_bytes(), "application/pdf")},
        headers=headers,
    )
    assert upload.status_code == 201
    document_id = upload.json()["id"]

    # Chunks were indexed for this document.
    indexed = vector_store.collection.get(
        where={"$and": [
            {"document_id": {"$eq": document_id}},
            {"user_id": {"$eq": user["id"]}},
        ]}
    )
    assert len(indexed["ids"]) > 0

    # The stored file exists and is served back as PDF.
    file_path = upload.json().get("file_path")
    assert file_path is None  # file_path is not exposed to clients

    file_response = client.get(
        f"/documents/{document_id}/file",
        headers=headers,
    )
    assert file_response.status_code == 200
    assert file_response.headers["content-type"] == "application/pdf"

    # Delete the document.
    delete_response = client.delete(
        f"/documents/{document_id}",
        headers=headers,
    )
    assert delete_response.status_code == 204

    # Database row is gone.
    assert client.get(
        f"/documents/{document_id}",
        headers=headers,
    ).status_code == 404

    # Vector chunks were cleaned up.
    remaining = vector_store.collection.get(
        where={"$and": [
            {"document_id": {"$eq": document_id}},
            {"user_id": {"$eq": user["id"]}},
        ]}
    )
    assert len(remaining["ids"]) == 0


def test_document_file_and_delete_scoped_to_owner():
    user_a = create_user_and_token()
    user_b = create_user_and_token()

    document_id = client.post(
        "/documents/upload",
        files={"file": ("sample.pdf", _sample_pdf_bytes(), "application/pdf")},
        headers={"Authorization": f"Bearer {user_a['token']}"},
    ).json()["id"]

    # User B cannot download or delete A's document.
    assert client.get(
        f"/documents/{document_id}/file",
        headers={"Authorization": f"Bearer {user_b['token']}"},
    ).status_code == 404

    assert client.delete(
        f"/documents/{document_id}",
        headers={"Authorization": f"Bearer {user_b['token']}"},
    ).status_code == 404