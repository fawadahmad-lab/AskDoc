"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { logout, me } from "@/lib/api";
import type { User } from "@/lib/auth";

type UserContextValue = {
  user: User | null;
  isLoading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const UserContext = React.createContext<UserContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const loadUser = React.useCallback(async () => {
    try {
      const u = await me();
      setUser(u);
    } catch {
      setUser(null);
    }
  }, []);

  // Resolve identity from the httpOnly session cookie on mount. The token
  // never reaches the browser — this is the single source of truth for who
  // is currently signed in.
  React.useEffect(() => {
    let cancelled = false;
    me()
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const signOut = React.useCallback(async () => {
    try {
      await logout();
    } finally {
      setUser(null);
      router.replace("/login");
    }
  }, [router]);

  const value = React.useMemo<UserContextValue>(
    () => ({ user, isLoading, logout: signOut, refreshUser: loadUser }),
    [user, isLoading, signOut, loadUser]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = React.useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser must be used within a SessionProvider");
  }
  return ctx;
}