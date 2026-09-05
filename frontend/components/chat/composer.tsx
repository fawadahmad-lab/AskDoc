"use client";

import * as React from "react";
import { ArrowUp, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useDocuments } from "./use-documents";
import { toast } from "sonner";

export function Composer({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = React.useState("");
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const { upload, isUploading } = useDocuments();

  const canSend = value.trim().length > 0 && !disabled;

  function handleFile(file: File | undefined | null) {
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Only PDF files are supported");
      return;
    }
    upload(file, {
      onSuccess: () => {
        toast.success("Document uploaded & indexed");
        if (fileRef.current) fileRef.current.value = "";
      },
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : "Upload failed"),
    });
  }

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
      <div
        className={cn(
          "relative flex flex-col rounded-2xl border border-input bg-card shadow-[var(--shadow-softer)] transition-shadow",
          "focus-within:border-ring/60 focus-within:shadow-[var(--shadow-glow)]"
        )}
      >
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
          className="scrollbar-thin block max-h-[200px] w-full resize-none bg-transparent px-4 pt-4 pb-12 text-[15px] leading-6 text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <div className="absolute bottom-2.5 left-2.5">
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={disabled || isUploading}
            aria-label={isUploading ? "Uploading document" : "Upload a document"}
            className="flex size-8 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground enabled:cursor-pointer disabled:opacity-50"
          >
            <Plus className="size-5" />
          </button>
        </div>
        <div className="absolute bottom-2 right-2">
          <Button
            size="icon"
            onClick={submit}
            disabled={!canSend}
            className={cn(
              "size-9 rounded-xl transition-all",
              canSend
                ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                : ""
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
