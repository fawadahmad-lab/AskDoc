import type { NextRequest } from "next/server";

import { forward } from "@/lib/backend";

export const dynamic = "force-dynamic";

export async function GET() {
  return forward("/conversations");
}

export async function POST(request: NextRequest) {
  let body: { title?: string } | null = null;
  try {
    const parsed = (await request.json()) as { title?: string };
    body = parsed;
  } catch {
    /* empty body is allowed for conversation creation */
  }

  return forward("/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: body?.title ?? null }),
  });
}