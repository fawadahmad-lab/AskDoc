import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { backendFetch } from "@/lib/backend";
import type { UserResponse } from "@/lib/api";

export async function POST(request: NextRequest) {
  let body: {
    email?: string;
    username?: string;
    password?: string;
    groqApiKey?: string;
  };
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
  const groqApiKey = body?.groqApiKey?.trim();
  if (!email || !username || !password) {
    return NextResponse.json(
      { detail: "Email, username, and password are required" },
      { status: 400 }
    );
  }
  if (!groqApiKey) {
    return NextResponse.json(
      { detail: "A Groq API key is required. Create one at https://console.groq.com/keys" },
      { status: 400 }
    );
  }

  const signupRes = await backendFetch("/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, username, password, groq_api_key: groqApiKey }),
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

  // The account is created unverified and no session is issued here — the
  // user must confirm the emailed code on /verify-email before signing in.
  const user = (await signupRes.json()) as UserResponse;
  return NextResponse.json({ user }, { status: 201 });
}