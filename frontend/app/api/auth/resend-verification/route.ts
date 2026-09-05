import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { backendFetch } from "@/lib/backend";

export async function POST(request: NextRequest) {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { detail: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const email = body?.email?.trim();
  if (!email) {
    return NextResponse.json(
      { detail: "Email is required" },
      { status: 400 }
    );
  }

  const res = await backendFetch("/auth/resend-verification", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
    token: null,
  });

  let detail = "If the account exists and is unverified, a new verification code was sent.";
  try {
    const parsed = (await res.json()) as { detail?: string };
    if (parsed?.detail) detail = parsed.detail;
  } catch {
    /* non-JSON error body */
  }
  return NextResponse.json({ detail }, { status: 200 });
}