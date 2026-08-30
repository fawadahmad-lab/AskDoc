"use client";

import { motion } from "framer-motion";
import { FileText } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Role } from "./types";

export function AssistantAvatar({ role }: { role: Role }) {
  return (
    <div
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-xl",
        role === "assistant"
          ? "bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-[var(--shadow-glow)]"
          : "bg-muted text-muted-foreground"
      )}
    >
      {role === "assistant" ? (
        <FileText className="size-4" />
      ) : (
        <UserGlyph />
      )}
    </div>
  );
}

function UserGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5 19c0-3 3-5 7-5s7 2 7 5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};

export function MessageWrapper({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      {...fadeUp}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn("flex gap-3", className)}
    >
      {children}
    </motion.div>
  );
}
