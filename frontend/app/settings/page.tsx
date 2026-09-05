"use client";

import * as React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  ArrowLeft,
  ExternalLink,
  KeyRound,
  Loader2,
  Monitor,
  Moon,
  Palette,
  Save,
  Sun,
} from "lucide-react";

import { BrandMark, BrandWordmark } from "@/components/auth/brand-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/lib/use-user";
import { updateGroqApiKey } from "@/lib/api";
import { cn } from "@/lib/utils";

const GROQ_CONSOLE_URL = "https://console.groq.com/keys";

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export default function SettingsPage() {
  const { user, refreshUser } = useUser();
  const { theme, setTheme } = useTheme();
  const [key, setKey] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [status, setStatus] = React.useState<
    | { kind: "idle" }
    | { kind: "success"; message: string }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = key.trim();
    if (!trimmed) {
      setStatus({ kind: "error", message: "Paste your new Groq API key first." });
      return;
    }
    setIsSaving(true);
    setStatus({ kind: "idle" });
    try {
      await updateGroqApiKey({ groqApiKey: trimmed });
      setKey("");
      await refreshUser();
      setStatus({
        kind: "success",
        message: "Groq API key updated. Future answers will use the new key.",
      });
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Failed to update the key.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  // Hydration-safe initial value; next-themes returns "system" on the server.
  const resolved = React.useMemo(
    () => (theme as string) || "system",
    [theme]
  );

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border/70 px-4">
        <Link
          href="/chat"
          className="flex items-center gap-2 rounded-lg px-2 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          <span className="text-sm">Back to chat</span>
        </Link>
        <div className="flex-1" />
        <div className="flex items-center gap-2 lg:hidden">
          <BrandWordmark className="text-base" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 md:px-6">
        <div className="mb-8 flex items-center gap-3">
          <BrandMark className="size-10 rounded-xl" />
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              Settings
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage your Groq API key and app appearance.
            </p>
          </div>
        </div>

        {/* Appearance */}
        <section className="mb-6 rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <Palette className="size-5 text-primary" />
            <h2 className="text-base font-medium">Appearance</h2>
          </div>
          <p className="mb-3 text-sm text-muted-foreground">
            Choose how Docly looks — light, dark, or follow your system.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-sm transition-colors",
                  resolved === value
                    ? "border-primary bg-accent text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                )}
              >
                <Icon className="size-5" />
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* Groq key */}
        <form
          onSubmit={handleSave}
          className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm"
        >
          <div className="mb-5 flex items-center gap-2">
            <KeyRound className="size-5 text-primary" />
            <h2 className="text-base font-medium">Groq API key</h2>
          </div>

          <dl className="mb-5 flex items-center justify-between rounded-xl border border-border/70 bg-muted/40 px-4 py-3 text-sm">
            <dt className="text-muted-foreground">Current key</dt>
            <dd className="font-mono text-foreground">
              {user?.groq_api_key_masked ?? "Not set"}
            </dd>
          </dl>

          <label
            htmlFor="groq-key"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Replace key
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              id="groq-key"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="gsk_…"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              className="h-11 flex-1 rounded-xl font-mono"
            />
            <Button
              type="submit"
              size="lg"
              disabled={isSaving}
              className="h-11 rounded-xl"
            >
              {isSaving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Save key
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>Get or manage your key at</span>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="gap-1 rounded-lg border-border"
            >
              <a href={GROQ_CONSOLE_URL} target="_blank" rel="noreferrer">
                console.groq.com/keys
                <ExternalLink />
              </a>
            </Button>
          </div>

          {status.kind === "success" && (
            <p className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
              {status.message}
            </p>
          )}
          {status.kind === "error" && (
            <p className="mt-4 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {status.message}
            </p>
          )}
        </form>
      </main>
    </div>
  );
}