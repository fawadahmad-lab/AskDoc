import type { ReactNode } from "react";

import { BrandMark, BrandWordmark } from "@/components/auth/brand-mark";
import { BrandPanel } from "@/components/auth/brand-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function AuthShell({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid w-full overflow-hidden rounded-[28px] border border-black/[0.06] bg-white shadow-[0_1px_3px_rgb(0_0_0/0.06),0_24px_60px_-24px_rgb(0_0_0/0.25)]",
        "lg:grid-cols-[1.05fr_0.95fr] dark:border-white/[0.08] dark:bg-card",
        className
      )}
    >
      <div className="flex flex-col p-8 sm:p-10 lg:p-12">
        <div className="flex items-center gap-2.5">
          <BrandMark className="size-9 rounded-xl" />
          <BrandWordmark className="text-[17px]" />
        </div>

        <div className="mt-10">
          <h1 className="font-heading text-[28px] font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2.5 max-w-md text-[15px] leading-6 text-muted-foreground">
              {subtitle}
            </p>
          ) : null}
        </div>

        <div className="mt-8 flex flex-1 flex-col">{children}</div>
      </div>

      <div className="hidden lg:block">
        <BrandPanel />
      </div>
    </div>
  );
}

export function AuthFormSkeleton({ variant = "default" }: { variant?: "default" | "signup" }) {
  const defaultRows = [1, 1, 1];
  const signupRows = [1, "grid", "grid", 1, 1] as const;

  const rows = variant === "signup" ? signupRows : defaultRows;

  return (
    <div className="space-y-5">
      {rows.map((row, i) =>
        row === "grid" ? (
          <div key={i} className="grid gap-5 sm:grid-cols-2">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        ) : (
          <Skeleton key={i} className="h-12 w-full rounded-xl" />
        )
      )}
    </div>
  );
}