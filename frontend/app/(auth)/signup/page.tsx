import { Suspense } from "react";
import Link from "next/link";

import { BrandMark, BrandWordmark } from "@/components/auth/brand-mark";
import { SignupForm } from "@/components/auth/signup-form";
import { Skeleton } from "@/components/ui/skeleton";

export default function SignupPage() {
  return (
    <>
      <div className="relative w-full">
        <div className="mb-8 flex items-center gap-3">
          <BrandMark className="size-10" />
          <BrandWordmark className="text-lg" />
        </div>

        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Create your account
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
          Upload documents and ask grounded questions. Answers come with
          citations you can trust.
        </p>

        <div className="mt-8">
          <Suspense fallback={<FormSkeleton />}>
            <SignupForm />
          </Suspense>
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            Sign in
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
      <div className="grid gap-5 sm:grid-cols-2">
        <Skeleton className="h-11 w-full rounded-xl" />
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
      <Skeleton className="h-11 w-full rounded-xl" />
    </div>
  );
}
