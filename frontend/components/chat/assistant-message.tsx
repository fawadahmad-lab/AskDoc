"use client";

import { motion } from "framer-motion";
import { FileText, Layers } from "lucide-react";

import { Markdown } from "./markdown";
import { AssistantAvatar } from "./message-elements";
import type { Message } from "./types";

export function AssistantMessage({
  message,
  streaming,
}: {
  message: Message;
  streaming?: boolean;
}) {
  return (
    <div className="group flex gap-3">
      <AssistantAvatar role="assistant" />
      <div className="min-w-0 flex-1 space-y-4 pt-1">
        <div>
          {message.error ? (
            <ErrorMessage text={message.content} />
          ) : streaming ? (
            <Thinking />
          ) : (
            <>
              <Markdown>{message.content}</Markdown>
              {Array.isArray(message.citations) &&
                message.citations.length > 0 && (
                  <Citations citations={message.citations} />
                )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <motion.div
        initial={{ opacity: 0, y: 6, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-[15px] leading-7 text-primary-foreground shadow-sm"
      >
        {content}
      </motion.div>
    </div>
  );
}

function Thinking() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center gap-2.5"
    >
      <span className="flex items-center gap-1.5 rounded-full bg-muted/60 py-2 pl-3.5 pr-3.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="size-2 rounded-full bg-primary"
            animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
            transition={{
              duration: 1.1,
              repeat: Infinity,
              delay: i * 0.18,
              ease: "easeInOut",
            }}
            aria-hidden
          />
        ))}
      </span>
    </motion.div>
  );
}

function ErrorMessage({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-[15px] text-destructive">
      {text}
    </div>
  );
}

function Citations({
  citations,
}: {
  citations: { document_id: number; page_number: number }[];
}) {
  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <Layers className="size-3.5" />
        Sources
      </div>
      <div className="flex flex-wrap gap-2">
        {citations.map((c, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1.5 text-xs text-muted-foreground"
          >
            <FileText className="size-3.5 text-primary" />
            Doc&nbsp;{c.document_id} · p.{c.page_number}
          </span>
        ))}
      </div>
    </div>
  );
}
