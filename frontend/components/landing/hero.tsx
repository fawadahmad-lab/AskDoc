"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BookOpen, MessageSquareText, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

function ChatPreview() {
  return (
    <div className="mx-auto w-full max-w-xl rounded-[20px] border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2 border-b pb-3">
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <BookOpen className="size-3.5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium">fundamentals-of-ml.pdf</p>
          <p className="text-[10px] text-muted-foreground">3 pages indexed</p>
        </div>
        <span className="ml-auto flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
          <Sparkles className="size-3" />
          Citing sources
        </span>
      </div>

      <div className="flex flex-col gap-3 pt-3">
        <div className="self-end max-w-[75%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-[13px] text-primary-foreground shadow-sm">
          What is a learning rate, and why does it matter?
        </div>
        <div className="self-start max-w-[85%] rounded-2xl rounded-bl-md border bg-background px-3.5 py-2.5">
          <p className="text-[13px] leading-6 text-foreground">
            The learning rate controls how much the model adjusts its weights on
            each step. A value that is too high overshoots, and one that is too
            low stalls training.
          </p>
          <span className="mt-2 inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            <MessageSquareText className="size-3" />
            Cited from page 2
          </span>
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  const reduce = useReducedMotion();

  return (
    <section className="relative overflow-hidden pb-24 pt-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-primary/[0.05] to-transparent" />
        <div className="absolute -top-40 left-1/2 size-[34rem] -translate-x-1/2 rounded-full bg-primary/10 blur-[140px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-[20px] bg-brand-tint px-6 pb-16 pt-14 text-center sm:px-12 md:pt-20"
        >
          <h1 className="mx-auto max-w-[16ch] text-balance font-heading text-4xl font-bold leading-[1.08] tracking-tight text-foreground md:text-6xl">
            Chat with your documents.
            <span className="text-primary"> Get instant answers.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-[46ch] text-pretty text-base leading-7 text-muted-foreground md:text-lg md:leading-8">
            Ask questions about your PDFs and get grounded answers with
            citations, right in your document library.
          </p>
          <div className="mt-8">
            <Button
              asChild
              size="lg"
              className="h-12 w-full min-w-[220px] rounded-lg px-10 text-base font-semibold sm:w-auto"
            >
              <Link href="/signup">
                Get Started
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.7,
            delay: 0.15,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="relative z-10 mx-auto -mt-10 max-w-2xl"
        >
          <ChatPreview />
        </motion.div>
      </div>
    </section>
  );
}