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

const DAYS = 24 * 60 * 60;

export async function POST(request: NextRequest) {
  let body: { username?: string; password?: string; remember?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { detail: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const username = body?.username?.trim();
  const password = body?.password;
  if (!username || !password) {
    return NextResponse.json(
      { detail: "Username and password are required" },
      { status: 400 }
    );
  }

  const remember = body?.remember === true;

  const form = new URLSearchParams();
  form.append("username", username);
  form.append("password", password);
  form.append("remember_me", remember ? "true" : "false");

  const res = await backendFetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
    token: null,
  });

  if (!res.ok) {
    let detail = "Invalid username or password";
    try {
      const parsed = (await res.json()) as { detail?: string };
      if (parsed?.detail) detail = parsed.detail;
    } catch {
      /* non-JSON error body */
    }
    return NextResponse.json({ detail }, { status: res.status });
  }

  const tokenRes = (await res.json()) as TokenResponse;

  // Resolve identity server-side so the browser only ever receives { user }.
  const me = await backendFetch("/auth/me", { token: tokenRes.access_token });
  if (!me.ok) {
    return NextResponse.json(
      { detail: "Failed to load user after login" },
      { status: 502 }
    );
  }
  const user = (await me.json()) as UserResponse;

  const response = NextResponse.json({ user }, { status: 200 });
  response.cookies.set(TOKEN_COOKIE, tokenRes.access_token, {
    ...COOKIE_OPTIONS,
    maxAge: remember ? 30 * DAYS : undefined,
  });
  return response;
}