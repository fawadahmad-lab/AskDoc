"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

import { Sidebar } from "@/components/chat/sidebar";
import { MobileNav } from "@/components/chat/mobile-nav";
import { ChatProvider } from "@/components/chat/chat-context";
import { SessionProvider, useUser } from "@/lib/use-user";
import { BrandWordmark } from "@/components/auth/brand-mark";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <AuthedChatLayout>{children}</AuthedChatLayout>
    </SessionProvider>
  );
}

function AuthedChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = React.useState(false);
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
    return <ChatLoading />;
  }

  return (
    <ChatProvider>
      <div className="flex h-dvh w-full overflow-hidden bg-background">
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
        />

        <section className="relative flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border/70 px-4">
            <MobileNav />
            {/* On tablets (collapsed hidden between md and lg) show brand */}
            <div className="flex items-center gap-2 lg:hidden">
              <BrandWordmark className="text-base" />
            </div>
            <div className="flex-1" />
          </header>

          <main className="relative flex min-h-0 flex-1 flex-col">
            {/* Subtle top gradient over content */}
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-6 bg-gradient-to-b from-background to-transparent" />
            <AnimatePresence mode="wait">
              <motion.div
                key="chat-content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="flex min-h-0 flex-1 flex-col"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </section>
      </div>
    </ChatProvider>
  );
}

function ChatLoading() {
  return (
    <div className="flex h-dvh w-full items-center justify-center bg-background">
      <div className="flex size-12 animate-pulse items-center justify-center rounded-2xl bg-primary/20">
        <div className="size-6 rounded-full bg-primary/50" />
      </div>
    </div>
  );
}