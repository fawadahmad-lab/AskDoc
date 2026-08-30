import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { authToken, BACKEND_URL } from "@/lib/backend";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/**
 * Proxy the stored PDF back to the browser as a blob so the Library preview
 * can render it without the browser ever seeing the auth token.
 */
export async function GET(_request: NextRequest, ctx: Context) {
  const { id } = await ctx.params;
  const token = await authToken();

  const res = await fetch(`${BACKEND_URL}/documents/${id}/file`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    let detail = "Could not load document file";
    try {
      const body = JSON.parse(text);
      if (body?.detail) detail = body.detail;
    } catch {
      // non-JSON error body
    }
    const error = NextResponse.json({ detail }, { status: res.status });
    if (res.status === 401) {
      error.cookies.delete({ name: "token", path: "/" });
    }
    return error;
  }

  const buffer = await res.arrayBuffer();
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "application/pdf",
      "Content-Disposition": res.headers.get("content-disposition") ?? "inline",
    },
  });
}
