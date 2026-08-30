import { Suspense } from "react";
import Link from "next/link";

import { BrandMark, BrandWordmark } from "@/components/auth/brand-mark";
import { LoginForm } from "@/components/auth/login-form";
import { Skeleton } from "@/components/ui/skeleton";

export default function LoginPage() {
  return (
    <>
      <div className="relative w-full">
        <div className="mb-8 flex items-center gap-3">
          <BrandMark className="size-10" />
          <BrandWordmark className="text-lg" />
        </div>

        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Welcome back
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
          Sign in to ask questions and get cited answers from your documents.
        </p>

        <div className="mt-8">
          <Suspense fallback={<FormSkeleton />}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-primary hover:underline"
          >
            Create one
          </Link>
        </p>
      </div>
    </>
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-11 w-full rounded-xl" />
      <Skeleton className="h-11 w-full rounded-xl" />
      <Skeleton className="h-11 w-full rounded-xl" />
    </div>
  );
}
