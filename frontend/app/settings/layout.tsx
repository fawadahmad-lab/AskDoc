"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

import { SessionProvider, useUser } from "@/lib/use-user";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <AuthedSettings>{children}</AuthedSettings>
    </SessionProvider>
  );
}

function AuthedSettings({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useUser();
  const router = useRouter();

  React.useEffect(() => {
    // Identity comes from the httpOnly session cookie via the BFF. Redirect
    // unauthenticated users to /login once the check completes.
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-background">
        <div className="w-full max-w-xl space-y-3 px-6">
          <Skeleton className="h-9 w-40 rounded-xl" />
          <Skeleton className="h-5 w-64 rounded-lg" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}