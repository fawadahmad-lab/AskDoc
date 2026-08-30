import type { User } from "./auth";

// ---------------------------------------------------------------------------
// Types mirroring the backend contract (FastAPI schemas in the repo).
// Do not rename fields — these match the backend response models exactly.
// ---------------------------------------------------------------------------

export type UserResponse = User;

export type SignupInput = {
  email: string;
  username: string;
  password: string;
};

export type LoginInput = {
  username: string;
  password: string;
};

export type DocumentResponse = {
  id: number;
  filename: string;
  created_at: string | null;
};

export type CitationResponse = {
  document_id: number;
  page_number: number;
};

export type ChatResponse = {
  answer: string;
  citations: CitationResponse[];
  cached: boolean;
  conversation_id: number | null;
};

export type ChatInput = {
  question: string;
  document_id?: number | null;
  conversation_id?: number | null;
};

export type ConversationResponse = {
  id: number;
  title: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type MessageResponse = {
  id: number;
  role: "user" | "assistant";
  content: string;
  citations: CitationResponse[] | null;
  document_id: number | null;
  created_at: string | null;
};

export type ConversationDetail = ConversationResponse & {
  messages: MessageResponse[];
};

export type AuthResponse = {
  user: User;
};

export type ApiErrorBody = {
  detail?: string;
};

// ---------------------------------------------------------------------------
// Client internals
// ---------------------------------------------------------------------------

const BASE = "/api";

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `Request failed with status ${res.status}`;
    try {
      const body = (await res.json()) as ApiErrorBody;
      if (body?.detail) detail = body.detail;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Auth (cookie session managed by the BFF — no token handling here)
// ---------------------------------------------------------------------------

/**
 * Sign up. The BFF signs the user in and sets the httpOnly session cookie.
 * Returns the created user.
 */
export async function signup(input: SignupInput): Promise<User> {
  const res = await fetch(`${BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await handle<AuthResponse>(res);
  return body.user;
}

/**
 * Log in. The BFF exchanges credentials for a token, stores it in an
 * httpOnly cookie, and returns the authenticated user.
 */
export async function login(input: LoginInput): Promise<User> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await handle<AuthResponse>(res);
  return body.user;
}

/**
 * Fetch the currently authenticated user from the httpOnly session cookie.
 * Throws `ApiError(401)` when signed out.
 */
export async function me(): Promise<User> {
  const res = await fetch(`${BASE}/auth/me`, {
    credentials: "include",
  });
  const body = await handle<AuthResponse>(res);
  return body.user;
}

/** Invalidate the httpOnly session cookie on the server. */
export async function logout(): Promise<void> {
  const res = await fetch(`${BASE}/auth/logout`, {
    method: "POST",
  });
  await handle<void>(res);
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export async function getDocuments(): Promise<DocumentResponse[]> {
  const res = await fetch(`${BASE}/documents`);
  return handle<DocumentResponse[]>(res);
}

/**
 * Upload a PDF document (multipart). Backend only accepts `application/pdf`.
 */
export async function uploadDocument(file: File): Promise<DocumentResponse> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${BASE}/documents/upload`, {
    method: "POST",
    body: form,
  });
  return handle<DocumentResponse>(res);
}

/**
 * Delete a document owned by the current user (removes its file and
 * vector-index chunks on the backend).
 */
export async function deleteDocument(id: number): Promise<void> {
  const res = await fetch(`${BASE}/documents/${id}`, {
    method: "DELETE",
  });
  await handle<void>(res);
}

/**
 * Fetch a document's stored PDF through the BFF and revoke it into an
 * object URL that the browser preview can render. Callers should revoke the
 * returned URL when done.
 */
export async function getDocumentFileUrl(id: number): Promise<string> {
  const res = await fetch(`${BASE}/documents/${id}/file`);
  if (!res.ok) {
    let detail = `Request failed with status ${res.status}`;
    try {
      const body = (await res.json()) as ApiErrorBody;
      if (body?.detail) detail = body.detail;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, detail);
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

/**
 * Ask a question about the user's documents within `conversation_id`.
 * When `conversation_id` is null, the backend lazily creates a new
 * conversation and returns its id in the response. Non-streaming.
 */
export async function chat(input: ChatInput): Promise<ChatResponse> {
  const res = await fetch(`${BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: input.question,
      document_id: input.document_id ?? null,
      conversation_id: input.conversation_id ?? null,
    }),
  });
  return handle<ChatResponse>(res);
}

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

export async function getConversations(): Promise<ConversationResponse[]> {
  const res = await fetch(`${BASE}/conversations`);
  return handle<ConversationResponse[]>(res);
}

export async function createConversation(
  title?: string
): Promise<ConversationResponse> {
  const res = await fetch(`${BASE}/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: title ?? null }),
  });
  return handle<ConversationResponse>(res);
}

export async function getConversation(
  id: number
): Promise<ConversationDetail> {
  const res = await fetch(`${BASE}/conversations/${id}`);
  return handle<ConversationDetail>(res);
}

export async function deleteConversation(id: number): Promise<void> {
  const res = await fetch(`${BASE}/conversations/${id}`, {
    method: "DELETE",
  });
  await handle<void>(res);
}

export async function renameConversation(
  id: number,
  title: string | null
): Promise<ConversationResponse> {
  const res = await fetch(`${BASE}/conversations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: title ?? null }),
  });
  return handle<ConversationResponse>(res);
}