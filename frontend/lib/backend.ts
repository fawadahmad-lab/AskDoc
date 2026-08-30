import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const BACKEND_URL =
  process.env.BACKEND_URL ?? "http://localhost:8000";

export const TOKEN_COOKIE = "token";

export type BackendError = {
  detail?: string;
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
};

export async function authToken(): Promise<string | null> {
  const store = await cookies();
  const value = store.get(TOKEN_COOKIE)?.value;
  return value && value.length > 0 ? value : null;
}

/**
 * Forward a request to the FastAPI backend, attaching the current user's
 * Bearer token from the httpOnly cookie when present. The browser never
 * sends or sees the token.
 */
export async function backendFetch(
  path: string,
  init: RequestInit & { token?: string | null } = {}
): Promise<Response> {
  const { token: tokenOverride, headers, ...rest } = init;
  const token = tokenOverride !== undefined ? tokenOverride : await authToken();

  const forwardedHeaders = new Headers(headers);
  if (token) {
    forwardedHeaders.set("Authorization", `Bearer ${token}`);
  }

  return fetch(`${BACKEND_URL}${path}`, {
    ...rest,
    headers: forwardedHeaders,
  });
}

export async function backendJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await backendFetch(path, init);
  if (!res.ok) {
    let detail = `Backend request to ${path} failed with status ${res.status}`;
    try {
      const body = (await res.json()) as BackendError;
      if (body?.detail) detail = body.detail;
    } catch {
      /* non-JSON error body */
    }
    throw new BackendRequestError(res.status, detail);
  }
  return res.json() as Promise<T>;
}

/**
 * Forward a backend response back to the browser, preserving its status and
 * JSON body. 401s additionally clear the auth cookie.
 */
export async function forward(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const res = await backendFetch(path, init);

  if (res.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  const raw = await res.text();
  let payload: unknown;
  try {
    payload = raw.length ? JSON.parse(raw) : null;
  } catch {
    payload = { detail: raw || `Backend request to ${path} failed` };
  }

  const response = NextResponse.json(payload, { status: res.status });

  if (res.status === 401) {
    // Delete the httpOnly session cookie. Path must match the cookie's own
    // path ("/") or the browser will not remove it.
    response.cookies.delete({ name: TOKEN_COOKIE, path: "/" });
  }

  return response;
}

/**
 * Mirror a backend error into a JSON response for the browser, preserving
 * the status code. 401s additionally clear the auth cookie.
 */
export async function errorResponse(
  err: unknown,
  path: string
): Promise<Response> {
  let status = 502;
  let detail = `Backend request to ${path} failed`;

  if (err instanceof BackendRequestError) {
    status = err.status;
    detail = err.detail;
  }

  const res = NextResponse.json({ detail }, { status });

  if (status === 401) {
    res.cookies.delete(TOKEN_COOKIE);
  }

  return res;
}

export class BackendRequestError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = "BackendRequestError";
    this.status = status;
    this.detail = detail;
  }
}