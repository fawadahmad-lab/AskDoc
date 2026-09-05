import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AuthShell, AuthFormSkeleton } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";

  // No token means a broken link — render the not-found UI rather than a
  // form that can never succeed.
  if (!token) notFound();

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="The reset link is single-use and expires in 30 minutes."
    >
      <Suspense fallback={<AuthFormSkeleton />}>
        <ResetPasswordForm token={token} />
      </Suspense>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Back to{" "}
        <Link
          href="/login"
          className="font-medium text-primary hover:underline"
        >
          sign in
        </Link>
      </p>
    </AuthShell>
  );
}