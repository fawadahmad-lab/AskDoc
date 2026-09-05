"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, MailCheck, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { forgotPassword } from "@/lib/api";
import { ApiError } from "@/lib/api";

const forgotSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

type ForgotValues = z.infer<typeof forgotSchema>;

export function ForgotPasswordForm() {
  const [error, setError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);

  const form = useForm<ForgotValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  const isSubmitting = form.formState.isSubmitting;

  async function onSubmit(values: ForgotValues) {
    setError(null);
    try {
      await forgotPassword({ email: values.email.trim() });
      setSent(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : "Request failed");
    }
  }

  if (sent) {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <MailCheck className="mx-auto size-10 text-primary" />
          <h2 className="mt-3 font-heading text-xl font-semibold">
            Check your inbox
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            If an account exists with that email, we sent a link to reset your
            password. It expires in 30 minutes.
          </p>
        </div>
        <Button
          asChild
          size="lg"
          variant="outline"
          className="h-11 w-full rounded-xl text-[15px]"
        >
          <Link href="/login">Back to sign in</Link>
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

        {error && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
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
              Sending link…
            </>
          ) : (
            <>
              Email reset link
              <Send className="size-4" />
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}