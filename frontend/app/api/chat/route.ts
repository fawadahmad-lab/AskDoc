import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { forward } from "@/lib/backend";

export async function POST(request: NextRequest) {
  let body: {
    question?: string;
    document_id?: number | null;
    conversation_id?: number | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { detail: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const question = body?.question?.trim();
  if (!question) {
    return NextResponse.json(
      { detail: "question is required" },
      { status: 400 }
    );
  }

  return forward("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question,
      document_id: body.document_id ?? null,
      conversation_id: body.conversation_id ?? null,
    }),
  });
}