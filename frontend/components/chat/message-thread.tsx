"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { BookOpenText } from "lucide-react";

import { AssistantMessage, UserBubble } from "./assistant-message";
import { useChat } from "./chat-context";

export function MessageThread() {
  const { messages, isBusy } = useChat();
  const endRef = React.useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever messages change (incl. streaming placeholders).
  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, isBusy]);

  if (messages.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="flex flex-col gap-8">
      {messages.map((message, i) => {
        if (message.role === "user") {
          return <UserBubble key={message.id} content={message.content} />;
        }
        const isStreamingPlaceholder =
          message.content === "" && i === messages.length - 1 && isBusy;
        return (
          <AssistantMessage
            key={message.id}
            message={message}
            streaming={isStreamingPlaceholder}
          />
        );
      })}
      {/* spacer to keep last message above gradient */}
      <div ref={endRef} />
    </div>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="flex h-full flex-col items-center justify-center gap-5 text-center"
    >
      <div className="relative flex size-16 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/20 to-accent/40 shadow-[var(--shadow-softer)]">
        <motion.div
          className="absolute inset-0 rounded-3xl bg-primary/10 blur-xl"
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <BookOpenText className="size-8 text-primary" />
      </div>
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Ask anything about your documents
        </h2>
        <p className="mx-auto mt-2 max-w-md text-[15px] text-muted-foreground">
          Upload PDFs to your library, then ask questions. Answers are grounded
          in your documents and come with page-level citations.
        </p>
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-2 text-sm">
        {["Summary", "Key numbers", "Quotes", "Comparisons"].map((s) => (
          <span
            key={s}
            className="rounded-full border bg-card px-3.5 py-1.5 text-muted-foreground"
          >
            {s}
          </span>
        ))}
      </div>
    </motion.div>
  );
}
