import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { forward } from "@/lib/backend";

export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { detail: "Expected multipart form data" },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { detail: "A file field is required" },
      { status: 400 }
    );
  }

  const out = new FormData();
  out.append("file", file, file.name);

  return forward("/documents/upload", {
    method: "POST",
    body: out,
  });
}