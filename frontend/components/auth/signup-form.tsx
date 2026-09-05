"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, ExternalLink, KeyRound, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/auth/password-input";
import { SocialButtons } from "@/components/auth/social-buttons";
import { signup } from "@/lib/api";

const GROQ_CONSOLE_URL = "https://console.groq.com/keys";

const signupSchema = z
  .object({
    username: z
      .string()
      .min(3, "Name must be at least 3 characters")
      .max(32, "Name must be at most 32 characters")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Only letters, numbers, and underscores are allowed"
      ),
    email: z.string().email("Enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    groqApiKey: z
      .string()
      .min(20, "Paste your full Groq API key")
      .refine((v) => v.startsWith("gsk_"), "Groq API keys start with 'gsk_'"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignupValues = z.infer<typeof signupSchema>;

export function SignupForm() {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      groqApiKey: "",
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  async function onSubmit(values: SignupValues) {
    setError(null);
    try {
      // The BFF creates the account (unverified) — no session yet. Send the
      // user to confirm the emailed 6-digit code before they can sign in.
      await signup({
        email: values.email,
        username: values.username,
        password: values.password,
        groqApiKey: values.groqApiKey.trim(),
      });
      router.replace(
        `/verify-email?email=${encodeURIComponent(values.email.trim())}`
      );
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Signup failed");
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name (username)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="jane_doe"
                    autoComplete="nickname"
                    className="h-12 rounded-xl bg-white shadow-xs dark:bg-input/30"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="you@gmail.com"
                    autoComplete="email"
                    className="h-12 rounded-xl bg-white shadow-xs dark:bg-input/30"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <PasswordInput
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                    className="rounded-xl"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm password</FormLabel>
                <FormControl>
                  <PasswordInput
                    placeholder="Repeat password"
                    autoComplete="new-password"
                    className="rounded-xl"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="groqApiKey"
          render={({ field }) => (
            <FormItem>
              <div className="rounded-2xl border border-border/70 bg-muted/40 p-4">
                <FormLabel className="flex items-center gap-1.5">
                  <KeyRound className="size-3.5" />
                  Groq API key
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="gsk_…"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    className="mt-2 h-11 rounded-xl bg-white font-mono shadow-xs dark:bg-input/30"
                    {...field}
                  />
                </FormControl>
                <FormDescription className="mt-2 text-xs">
                  Answers run behind <em>your</em> key, never ours.
                </FormDescription>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="mt-2 gap-1 rounded-lg border-border bg-card"
                >
                  <a href={GROQ_CONSOLE_URL} target="_blank" rel="noreferrer">
                    Get a Groq API key
                    <ExternalLink className="size-3.5" />
                  </a>
                </Button>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />

        {error && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Button
          type="submit"
          size="lg"
          disabled={isSubmitting}
          className="mt-1 h-12 w-full rounded-xl bg-indigo-600 text-[15px] font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Creating account…
            </>
          ) : (
            <>
              Create account
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>

        <SocialButtons />
      </form>
    </Form>
  );
}