import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { backendFetch, TOKEN_COOKIE, type TokenResponse } from "@/lib/backend";
import type { UserResponse } from "@/lib/api";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
};

export async function POST(request: NextRequest) {
  let body: { email?: string; username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { detail: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const email = body?.email?.trim();
  const username = body?.username?.trim();
  const password = body?.password;
  if (!email || !username || !password) {
    return NextResponse.json(
      { detail: "Email, username, and password are required" },
      { status: 400 }
    );
  }

  const signupRes = await backendFetch("/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, username, password }),
    token: null,
  });

  if (!signupRes.ok) {
    let detail = "Signup failed";
    try {
      const parsed = (await signupRes.json()) as { detail?: string };
      if (parsed?.detail) detail = parsed.detail;
    } catch {
      /* non-JSON error body */
    }
    return NextResponse.json({ detail }, { status: signupRes.status });
  }

  // The signup endpoint does not issue a token, so log in server-side to
  // establish the session cookie.
  const form = new URLSearchParams();
  form.append("username", username);
  form.append("password", password);

  const loginRes = await backendFetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
    token: null,
  });
  if (!loginRes.ok) {
    return NextResponse.json(
      { detail: "Account created, but auto-login failed. Please sign in." },
      { status: 502 }
    );
  }

  const tokenRes = (await loginRes.json()) as TokenResponse;

  const me = await backendFetch("/auth/me", { token: tokenRes.access_token });
  if (!me.ok) {
    return NextResponse.json(
      { detail: "Account created, but failed to load user. Please sign in." },
      { status: 502 }
    );
  }
  const user = (await me.json()) as UserResponse;

  const response = NextResponse.json({ user }, { status: 201 });
  response.cookies.set(TOKEN_COOKIE, tokenRes.access_token, COOKIE_OPTIONS);
  return response;
}