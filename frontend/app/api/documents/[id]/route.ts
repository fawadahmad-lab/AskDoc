import type { NextRequest } from "next/server";

import { forward } from "@/lib/backend";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, ctx: Context) {
  const { id } = await ctx.params;
  return forward(`/documents/${id}`, { method: "DELETE" });
}
