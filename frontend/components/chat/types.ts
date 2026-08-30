import type { CitationResponse } from "@/lib/api";

export type Role = "user" | "assistant";

export type Message = {
  id: string;
  role: Role;
  content: string;
  citations?: CitationResponse[];
  cached?: boolean;
  error?: boolean;
  createdAt: number;
};

export type PendingMessage = Omit<Message, "id" | "createdAt" | "citations"> & {
  id: string;
  createdAt: number;
  citations?: CitationResponse[];
};
