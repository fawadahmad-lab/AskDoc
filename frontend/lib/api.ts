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
  groqApiKey: string;
};

export type LoginInput = {
  username: string;
  password: string;
  remember?: boolean;
};

export type GroqKeyUpdateInput = {
  groqApiKey: string;
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
 * Sign up. The account starts unverified — the backend emails a 6-digit code
 * the user must confirm on /verify-email before they can sign in.
 * Returns the created (unverified) user.
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

/** Confirm a 6-digit code emailed at signup to activate the account. */
export async function verifyEmail(input: {
  email: string;
  code: string;
}): Promise<User> {
  const res = await fetch(`${BASE}/auth/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await handle<AuthResponse>(res);
  return body.user;
}

/** Request a fresh verification code (resend link on the verify page). */
export async function resendVerification(input: {
  email: string;
}): Promise<{ detail: string }> {
  const res = await fetch(`${BASE}/auth/resend-verification`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handle<{ detail: string }>(res);
}

/** Request a password-reset email. Always returns a generic success message. */
export async function forgotPassword(input: {
  email: string;
}): Promise<{ detail: string }> {
  const res = await fetch(`${BASE}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handle<{ detail: string }>(res);
}

/** Set a new password with a single-use token from the reset email. */
export async function resetPassword(input: {
  token: string;
  newPassword: string;
}): Promise<{ detail: string }> {
  const res = await fetch(`${BASE}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: input.token,
      new_password: input.newPassword,
    }),
  });
  return handle<{ detail: string }>(res);
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

/**
 * Replace the current user's Groq API key. The BFF verifies it against the
 * backend (which live-checks it with Groq) before returning the updated user.
 */
export async function updateGroqApiKey(
  input: GroqKeyUpdateInput
): Promise<User> {
  const res = await fetch(`${BASE}/auth/groq-key`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await handle<AuthResponse>(res);
  return body.user;
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