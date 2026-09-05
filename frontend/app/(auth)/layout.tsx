import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-[#f4f5f7] px-4 py-10 dark:bg-[#0d0e10]">
      <main className="w-full max-w-5xl">{children}</main>
    </div>
  );
}