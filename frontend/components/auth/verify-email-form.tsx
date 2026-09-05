"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, KeyRound, Loader2, MailCheck } from "lucide-react";

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
import { resendVerification, verifyEmail } from "@/lib/api";
import { ApiError } from "@/lib/api";

const verifySchema = z.object({
  email: z.string().email("Enter a valid email address"),
  code: z
    .string()
    .regex(/^\d{6}$/, "Enter the 6-digit code from your email"),
});

type VerifyValues = z.infer<typeof verifySchema>;

export function VerifyEmailForm({ initialEmail }: { initialEmail: string }) {
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [resending, setResending] = React.useState(false);
  const [resendSent, setResendSent] = React.useState(false);
  const [verified, setVerified] = React.useState(false);

  const form = useForm<VerifyValues>({
    resolver: zodResolver(verifySchema),
    defaultValues: { email: initialEmail, code: "" },
  });

  const isSubmitting = form.formState.isSubmitting;

  async function onSubmit(values: VerifyValues) {
    setError(null);
    setNotice(null);
    try {
      await verifyEmail({ email: values.email.trim(), code: values.code });
      setVerified(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : "Verification failed");
    }
  }

  async function onResend() {
    const email = form.getValues("email").trim();
    setError(null);
    setNotice(null);
    if (!email) {
      setError("Enter your email first, then request a new code.");
      return;
    }
    setResending(true);
    try {
      await resendVerification({ email });
      setResendSent(true);
      setNotice("A new code was sent. Check your inbox (and spam).");
    } catch (e) {
      setError(
        e instanceof ApiError ? e.detail : "Could not resend the code."
      );
    } finally {
      setResending(false);
    }
  }

  if (verified) {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-6 text-center">
          <MailCheck className="mx-auto size-10 text-emerald-500" />
          <h2 className="mt-3 font-heading text-xl font-semibold">
            Email verified!
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Your account is active. Sign in to upload documents and start
            asking questions.
          </p>
        </div>
        <Button asChild size="lg" className="h-11 w-full rounded-xl text-[15px]">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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
                  className="h-11 rounded-xl"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Verification code</FormLabel>
              <FormControl>
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  autoComplete="one-time-code"
                  className="h-11 rounded-xl font-mono tracking-[0.3em]"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                We emailed a 6-digit code to activate your account. Check your
                inbox (and spam).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {error && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {notice && (
          <div className="rounded-xl border border-border px-4 py-3 text-sm">
            {notice}
          </div>
        )}

        <Button
          type="submit"
          size="lg"
          disabled={isSubmitting}
          className="h-11 w-full rounded-xl text-[15px] font-medium"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Verifying…
            </>
          ) : (
            <>
              Verify email
              <KeyRound className="size-4" />
            </>
          )}
        </Button>

        <button
          type="button"
          onClick={onResend}
          disabled={resending || resendSent}
          className="mx-auto flex w-full items-center justify-center gap-1.5 text-center text-sm font-medium text-primary hover:underline disabled:opacity-60 disabled:no-underline"
        >
          {resending ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Sending…
            </>
          ) : resendSent ? (
            <>
              <CheckCircle2 className="size-3.5" />
              Code sent
            </>
          ) : (
            "Didn't get one? Resend the code"
          )}
        </button>
      </form>
    </Form>
  );
}