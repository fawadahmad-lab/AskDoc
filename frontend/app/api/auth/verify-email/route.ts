import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { backendFetch } from "@/lib/backend";
import type { UserResponse } from "@/lib/api";

export async function POST(request: NextRequest) {
  let body: { email?: string; code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { detail: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const email = body?.email?.trim();
  const code = body?.code?.trim();
  if (!email || !code) {
    return NextResponse.json(
      { detail: "Email and code are required" },
      { status: 400 }
    );
  }

  const res = await backendFetch("/auth/verify-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
    token: null,
  });

  if (!res.ok) {
    let detail = "Verification failed";
    try {
      const parsed = (await res.json()) as { detail?: string };
      if (parsed?.detail) detail = parsed.detail;
    } catch {
      /* non-JSON error body */
    }
    return NextResponse.json({ detail }, { status: res.status });
  }

  const user = (await res.json()) as UserResponse;
  return NextResponse.json({ user }, { status: 200 });
}