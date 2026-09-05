import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { backendFetch } from "@/lib/backend";
import type { UserResponse } from "@/lib/api";

export async function PUT(request: NextRequest) {
  let body: { groqApiKey?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON body" }, { status: 400 });
  }

  const groqApiKey = body?.groqApiKey?.trim();
  if (!groqApiKey) {
    return NextResponse.json(
      { detail: "Groq API key is required" },
      { status: 400 }
    );
  }

  const res = await backendFetch("/auth/me/groq-api-key", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ groq_api_key: groqApiKey }),
  });

  if (!res.ok) {
    let detail = "Failed to update Groq API key";
    try {
      const parsed = (await res.json()) as { detail?: string };
      if (parsed?.detail) detail = parsed.detail;
    } catch {
      /* non-JSON error body */
    }
    return NextResponse.json({ detail }, { status: res.status });
  }

  const user = (await res.json()) as UserResponse;
  return NextResponse.json({ user });
}