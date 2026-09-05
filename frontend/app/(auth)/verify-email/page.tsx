import { Suspense } from "react";
import Link from "next/link";

import { AuthShell, AuthFormSkeleton } from "@/components/auth/auth-card";
import { VerifyEmailForm } from "@/components/auth/verify-email-form";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const initialEmail = typeof params.email === "string" ? params.email : "";

  return (
    <AuthShell
      title="Verify your email"
      subtitle="Enter the 6-digit code we emailed to activate your account."
    >
      <Suspense fallback={<AuthFormSkeleton />}>
        <VerifyEmailForm initialEmail={initialEmail} />
      </Suspense>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Need your password reset instead?{" "}
        <Link
          href="/forgot-password"
          className="font-medium text-primary hover:underline"
        >
          Forgot password
        </Link>
      </p>
    </AuthShell>
  );
}