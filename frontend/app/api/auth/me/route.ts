import { NextResponse } from "next/server";

import { backendFetch } from "@/lib/backend";
import type { UserResponse } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const res = await backendFetch("/auth/me");

  if (res.ok) {
    const user = (await res.json()) as UserResponse;
    return NextResponse.json({ user }, { status: 200 });
  }

  if (res.status === 401) {
    return NextResponse.json(
      { detail: "Not authenticated" },
      { status: 401 }
    );
  }

  return NextResponse.json(
    { detail: "Failed to load user" },
    { status: 502 }
  );
}