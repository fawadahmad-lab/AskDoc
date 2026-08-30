import type { NextRequest } from "next/server";

import { forward } from "@/lib/backend";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, ctx: Context) {
  const { id } = await ctx.params;
  return forward(`/conversations/${id}`);
}

export async function DELETE(_request: NextRequest, ctx: Context) {
  const { id } = await ctx.params;
  return forward(`/conversations/${id}`, { method: "DELETE" });
}

export async function PATCH(request: NextRequest, ctx: Context) {
  const { id } = await ctx.params;
  const body = await request.json();
  return forward(`/conversations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: body.title ?? null }),
  });
}