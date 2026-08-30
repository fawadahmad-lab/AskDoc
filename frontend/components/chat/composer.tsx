"use client";

import * as React from "react";
import { ArrowUp, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function Composer({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = React.useState("");
  const ref = React.useRef<HTMLTextAreaElement>(null);

  const canSend = value.trim().length > 0 && !disabled;

  function autoResize() {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }

  function submit() {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue("");
    requestAnimationFrame(() => {
      if (ref.current) {
        ref.current.style.height = "auto";
        ref.current.focus();
      }
    });
  }

  return (
    <div className="w-full max-w-3xl">
      <div className="group relative rounded-2xl border border-border bg-card shadow-[var(--shadow-softer)] transition-shadow focus-within:border-primary/50 focus-within:shadow-[var(--shadow-glow)]">
        <textarea
          ref={ref}
          value={value}
          rows={1}
          placeholder="Ask a question about your documents…"
          onChange={(e) => {
            setValue(e.target.value);
            autoResize();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          className="scrollbar-thin block max-h-[200px] w-full resize-none bg-transparent px-4 pb-2 pt-4 pr-14 text-[15px] leading-6 text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <div className="flex items-center justify-between border-t px-3 py-2">
          <span className="flex items-center gap-1.5 pl-1 text-[11px] text-muted-foreground">
            <Sparkles className="size-3.5 text-primary/70" />
            Grounded, cited answers
          </span>
          <Button
            size="icon"
            onClick={submit}
            disabled={!canSend}
            className={cn(
              "size-9 rounded-xl transition-all",
              canSend ? "bg-primary text-primary-foreground hover:bg-primary/85" : ""
            )}
            aria-label="Send message"
          >
            <ArrowUp className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
