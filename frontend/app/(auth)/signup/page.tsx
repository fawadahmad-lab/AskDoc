import { Suspense } from "react";
import Link from "next/link";

import { AuthShell, AuthFormSkeleton } from "@/components/auth/auth-card";
import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Upload documents and ask grounded questions. Answers come with citations you can trust."
    >
      <Suspense fallback={<AuthFormSkeleton variant="signup" />}>
        <SignupForm />
      </Suspense>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-primary hover:underline"
        >
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}