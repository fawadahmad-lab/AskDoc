import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { backendFetch } from "@/lib/backend";

export async function POST(request: NextRequest) {
  let body: { token?: string; new_password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { detail: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const token = body?.token?.trim();
  const new_password = body?.new_password;
  if (!token || !new_password) {
    return NextResponse.json(
      { detail: "Token and new password are required" },
      { status: 400 }
    );
  }

  const res = await backendFetch("/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, new_password }),
    token: null,
  });

  if (!res.ok) {
    let detail = "Request failed";
    try {
      const parsed = (await res.json()) as { detail?: string };
      if (parsed?.detail) detail = parsed.detail;
    } catch {
      /* non-JSON error body */
    }
    return NextResponse.json({ detail }, { status: res.status });
  }

  const payload = (await res.json()) as { detail?: string };
  return NextResponse.json(payload, { status: 200 });
}