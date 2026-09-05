from dotenv import load_dotenv
load_dotenv(".env.test")

import uuid
from unittest import mock

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.cache.redis import redis_client

# The app enforces a TrustedHost allowlist; TestClient's default "testserver"
# host is not in it, so pin an allowed host for all requests.
client = TestClient(app, headers={"Host": "localhost"})

FAKE_GROQ_KEY = "gsk_" + "x" * 40


@pytest.fixture(autouse=True)
def _clean_redis():
    """Start every test with a clean Redis.

    The suite signs up many users; without a flush the fixed-window signup
    rate limiter (10/hour by default) 429s later tests.
    """
    redis_client.flushdb()
    yield


def create_user_and_token():
    """Create an email-verified user and return (id, username, token)."""
    unique_id = uuid.uuid4().hex[:8]
    username = f"conv_user_{unique_id}"
    email = f"conv_{unique_id}@gmail.com"
    password = "testpassword123"

    sent_codes: list[str] = []

    def _spy_send_code(to, uname, code):
        sent_codes.append(code)

    # Live Groq verification is stubbed and the email code is captured, so the
    # flow never depends on a real key or an inbox.
    with (
        mock.patch("app.api.routes.auth.verify_groq_key", return_value=True),
        mock.patch(
            "app.api.routes.auth.send_verification_code",
            side_effect=_spy_send_code,
        ),
    ):
        signup_response = client.post(
            "/auth/signup",
            json={
                "email": email,
                "username": username,
                "password": password,
                "groq_api_key": FAKE_GROQ_KEY,
            },
        )
    assert signup_response.status_code == 201
    user = signup_response.json()
    user_id = user["id"]
    assert user["is_email_verified"] is False

    verify_response = client.post(
        "/auth/verify-email",
        json={"email": email, "code": sent_codes[0]},
    )
    assert verify_response.status_code == 200

    login_response = client.post(
        "/auth/login",
        data={"username": username, "password": password},
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]

    return {"id": user_id, "email": email, "username": username, "token": token}


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
    assert body["is_email_verified"] is True
    assert "hashed_password" not in body
    # Per-user Groq key is never returned in full — only masked.
    assert body["has_groq_api_key"] is True
    assert body["groq_api_key_masked"].startswith("••••")
    assert FAKE_GROQ_KEY not in str(body)


def test_login_remember_me_issues_long_lived_token():
    from datetime import datetime, timezone

    from app.core.security import decode_access_token

    user = create_user_and_token()

    session_login = client.post(
        "/auth/login",
        data={
            "username": user["username"],
            "password": "testpassword123",
            "remember_me": "false",
        },
    )
    remember_login = client.post(
        "/auth/login",
        data={
            "username": user["username"],
            "password": "testpassword123",
            "remember_me": "true",
        },
    )
    assert session_login.status_code == 200
    assert remember_login.status_code == 200

    now = datetime.now(timezone.utc).timestamp()
    session_ttl = (
        decode_access_token(session_login.json()["access_token"])["exp"] - now
    )
    remember_ttl = (
        decode_access_token(remember_login.json()["access_token"])["exp"] - now
    )

    # Default session stays short (~30 min); remember-me lasts for days.
    assert 25 * 60 < session_ttl < 60 * 60
    assert remember_ttl > 24 * 60 * 60


def test_signup_rejects_malformed_groq_key():
    response = client.post(
        "/auth/signup",
        json={
            "email": "bad_key@gmail.com",
            "username": "bad_key_user",
            "password": "testpassword123",
            "groq_api_key": "not-a-groq-key",
        },
    )

    assert response.status_code == 422


def test_signup_rejects_non_allowed_email_domain():
    with mock.patch("app.api.routes.auth.verify_groq_key", return_value=True):
        response = client.post(
            "/auth/signup",
            json={
                "email": "someone@hotmail.com",
                "username": "hotmail_user",
                "password": "testpassword123",
                "groq_api_key": FAKE_GROQ_KEY,
            },
        )

    assert response.status_code == 400
    assert "Google" in response.json()["detail"]


def test_signup_normalizes_gmail_aliases_and_blocks_duplicate():
    # Dots, case and +tags all resolve to the same Gmail mailbox.
    unq = uuid.uuid4().hex[:8]
    email_a = f"John.{unq}+shopping@GMAIL.com"
    email_b = f"john{unq}@gmail.com"
    canonical = f"john{unq}@gmail.com"

    with mock.patch("app.api.routes.auth.verify_groq_key", return_value=True):
        first = client.post(
            "/auth/signup",
            json={
                "email": email_a,
                "username": f"jdoe_first_{unq}",
                "password": "testpassword123",
                "groq_api_key": FAKE_GROQ_KEY,
            },
        )
    assert first.status_code == 201
    assert first.json()["email"] == canonical

    with mock.patch("app.api.routes.auth.verify_groq_key", return_value=True):
        duplicate = client.post(
            "/auth/signup",
            json={
                "email": email_b,
                "username": f"jdoe_second_{unq}",
                "password": "testpassword123",
                "groq_api_key": FAKE_GROQ_KEY,
            },
        )
    assert duplicate.status_code == 409


def test_login_blocked_until_email_verified():
    unique_id = uuid.uuid4().hex[:8]
    username = f"unverified_{unique_id}"
    email = f"unverified_{unique_id}@gmail.com"
    password = "testpassword123"

    with (
        mock.patch("app.api.routes.auth.verify_groq_key", return_value=True),
        mock.patch(
            "app.api.routes.auth.send_verification_code", return_value=None
        ),
    ):
        signup = client.post(
            "/auth/signup",
            json={
                "email": email,
                "username": username,
                "password": password,
                "groq_api_key": FAKE_GROQ_KEY,
            },
        )
    assert signup.status_code == 201

    # Login is blocked until the code is confirmed.
    login = client.post(
        "/auth/login",
        data={"username": username, "password": password},
    )
    assert login.status_code == 403
    assert "verified" in login.json()["detail"].lower()


def test_verify_email_rejects_wrong_code_then_accepts_correct():
    unique_id = uuid.uuid4().hex[:8]
    username = f"verify_{unique_id}"
    email = f"verify_{unique_id}@gmail.com"
    password = "testpassword123"
    sent_codes: list[str] = []

    with (
        mock.patch("app.api.routes.auth.verify_groq_key", return_value=True),
        mock.patch(
            "app.api.routes.auth.send_verification_code",
            side_effect=lambda to, uname, code: sent_codes.append(code),
        ),
    ):
        signup = client.post(
            "/auth/signup",
            json={
                "email": email,
                "username": username,
                "password": password,
                "groq_api_key": FAKE_GROQ_KEY,
            },
        )
    assert signup.status_code == 201

    wrong = client.post(
        "/auth/verify-email",
        json={"email": email, "code": "000000"},
    )
    assert wrong.status_code == 400

    correct = client.post(
        "/auth/verify-email",
        json={"email": email, "code": sent_codes[0]},
    )
    assert correct.status_code == 200
    assert correct.json()["is_email_verified"] is True

    login = client.post(
        "/auth/login",
        data={"username": username, "password": password},
    )
    assert login.status_code == 200


def test_resend_verification_sends_fresh_code():
    unique_id = uuid.uuid4().hex[:8]
    username = f"resend_{unique_id}"
    email = f"resend_{unique_id}@gmail.com"
    password = "testpassword123"
    sent_codes: list[str] = []

    def _spy(to, uname, code):
        sent_codes.append(code)

    with (
        mock.patch("app.api.routes.auth.verify_groq_key", return_value=True),
        mock.patch(
            "app.api.routes.auth.send_verification_code", side_effect=_spy
        ),
    ):
        signup = client.post(
            "/auth/signup",
            json={
                "email": email,
                "username": username,
                "password": password,
                "groq_api_key": FAKE_GROQ_KEY,
            },
        )
    assert signup.status_code == 201
    original_code = sent_codes[0]
    sent_codes.clear()

    with mock.patch(
        "app.api.routes.auth.send_verification_code", side_effect=_spy
    ):
        resend = client.post(
            "/auth/resend-verification",
            json={"email": email},
        )
    assert resend.status_code == 200
    assert len(sent_codes) == 1
    assert sent_codes[0] != original_code

    # The fresh code works (old code is a hash overwrite, not an append).
    verify = client.post(
        "/auth/verify-email",
        json={"email": email, "code": sent_codes[0]},
    )
    assert verify.status_code == 200


def test_forgot_password_reset_flow_and_single_use():
    user = create_user_and_token()
    reset_urls: list[str] = []

    def _spy_reset(to, uname, reset_url):
        reset_urls.append(reset_url)

    with mock.patch(
        "app.api.routes.auth.send_password_reset", side_effect=_spy_reset
    ):
        response = client.post(
            "/auth/forgot-password",
            json={"email": user["email"]},
        )
    assert response.status_code == 200
    assert "sent" in response.json()["detail"].lower()
    assert len(reset_urls) == 1
    token = reset_urls[0].split("token=")[1]

    new_password = "newpassword456"
    reset = client.post(
        "/auth/reset-password",
        json={"token": token, "new_password": new_password},
    )
    assert reset.status_code == 200

    # Old password fails, new password works.
    assert client.post(
        "/auth/login",
        data={"username": user["username"], "password": "testpassword123"},
    ).status_code == 401

    assert client.post(
        "/auth/login",
        data={"username": user["username"], "password": new_password},
    ).status_code == 200

    # The token is single-use.
    assert client.post(
        "/auth/reset-password",
        json={"token": token, "new_password": "anotherpass789"},
    ).status_code == 400


def test_forgot_password_does_not_leak_registered_emails():
    response = client.post(
        "/auth/forgot-password",
        json={"email": "nobody@gmail.com"},
    )
    assert response.status_code == 200
    assert "If an account exists" in response.json()["detail"]


def test_update_groq_api_key():
    user = create_user_and_token()
    headers = {"Authorization": f"Bearer {user['token']}"}

    new_key = "gsk_" + "y" * 40
    with mock.patch("app.api.routes.auth.verify_groq_key", return_value=True):
        response = client.put(
            "/auth/me/groq-api-key",
            json={"groq_api_key": new_key},
            headers=headers,
        )

    assert response.status_code == 200
    body = response.json()
    assert body["has_groq_api_key"] is True
    assert body["groq_api_key_masked"].endswith(new_key[-4:])
    assert new_key not in str(body)


def test_update_groq_api_key_rejects_bad_key():
    user = create_user_and_token()
    headers = {"Authorization": f"Bearer {user['token']}"}

    with mock.patch("app.api.routes.auth.verify_groq_key", return_value=False):
        response = client.put(
            "/auth/me/groq-api-key",
            json={"groq_api_key": FAKE_GROQ_KEY},
            headers=headers,
        )

    assert response.status_code == 400


def test_chat_requires_groq_key():
    # A user whose stored key cannot be decrypted/missing is rejected with a
    # clear message instead of a 500.
    user = create_user_and_token()
    headers = {"Authorization": f"Bearer {user['token']}"}

    # Simulate a user without a key by clearing the encrypted column.
    from app.db.base import SessionLocal
    from app.db import models

    with SessionLocal() as db:
        db_user = db.get(models.User, user["id"])
        db_user.groq_api_key_enc = None
        db.commit()

    response = client.post(
        "/chat",
        json={"question": "Hello"},
        headers=headers,
    )

    assert response.status_code == 400
    assert "Groq API key" in response.json()["detail"]


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
    _CANONICAL = {
        "answer": "A sample grounded answer",
        "citations": [],
        "citation_accuracy": 1.0,
        "groundedness": True,
    }

    user = create_user_and_token()
    headers = {"Authorization": f"Bearer {user['token']}"}

    with mock.patch(
        "app.api.routes.chat.run_rag_pipeline", return_value=dict(_CANONICAL)
    ):
        # No conversation_id -> auto-created.
        response = client.post(
            "/chat",
            json={"question": "Hello there"},
            headers=headers,
        )
    assert response.status_code == 200
    body = response.json()
    assert body["answer"] == _CANONICAL["answer"]
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
    _CANONICAL = {
        "answer": "A sample grounded answer",
        "citations": [],
        "citation_accuracy": 1.0,
        "groundedness": True,
    }

    user = create_user_and_token()
    headers = {"Authorization": f"Bearer {user['token']}"}

    conversation_id = client.post(
        "/conversations",
        json={"title": "Existing chat"},
        headers=headers,
    ).json()["id"]

    with mock.patch(
        "app.api.routes.chat.run_rag_pipeline", return_value=dict(_CANONICAL)
    ):
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
        b"(Docly sample document) Tj ET\nendstream\nendobj\n"
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