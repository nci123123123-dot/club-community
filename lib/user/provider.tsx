"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "../data/types";
import { getRepository } from "../data";
import { seedRepository, seedUserNotifications } from "../data/seed";

const COOKIE_NAME = "cc.user";
const COOKIE_DAYS = 30;
const DB_TIMEOUT_MS = 5_000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("db_timeout")), ms)
    ),
  ]);
}

function setCookie(name: string, value: string, days: number): void {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires};path=/;SameSite=Lax`;
}

function getCookie(name: string): string | null {
  const entry = document.cookie
    .split("; ")
    .find((r) => r.startsWith(name + "="));
  if (!entry) return null;
  return decodeURIComponent(entry.split("=")[1]);
}

function removeCookie(name: string): void {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`;
}

interface UserContextValue {
  user: User | null;
  setUser: (user: User | null) => void;
  ready: boolean;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    async function bootstrap() {
      const repo = getRepository();
      if (process.env.NEXT_PUBLIC_DATA_SOURCE !== "supabase") {
        try {
          await seedRepository(repo);
        } catch {
          // Non-fatal.
        }
      }

      // Read from cookie first; fall back to localStorage for existing sessions.
      let stored: User | null = null;
      const cookieRaw = getCookie(COOKIE_NAME);
      if (cookieRaw) {
        try {
          stored = JSON.parse(cookieRaw) as User;
        } catch {
          removeCookie(COOKIE_NAME);
        }
      } else {
        // One-time migration: lift existing localStorage session into a cookie.
        try {
          const lsRaw = window.localStorage.getItem("cc.currentUser");
          if (lsRaw) {
            stored = JSON.parse(lsRaw) as User;
            setCookie(COOKIE_NAME, lsRaw, COOKIE_DAYS);
            window.localStorage.removeItem("cc.currentUser");
          }
        } catch {
          // localStorage unavailable in some in-app browsers — ignore.
        }
      }

      // Re-verify against DB so we always have the current UUID.
      // Wrapped in withTimeout so a paused/unreachable Supabase instance never
      // blocks the bootstrap indefinitely — we fall back to the cached session.
      if (stored) {
        try {
          const fresh = await withTimeout(
            repo.findUserByStudentId(stored.studentId),
            DB_TIMEOUT_MS
          );
          if (fresh) {
            stored = fresh;
            setCookie(COOKIE_NAME, JSON.stringify(fresh), COOKIE_DAYS);
          } else {
            stored = null;
            removeCookie(COOKIE_NAME);
          }
        } catch {
          // DB unreachable or timed out — proceed with cached session.
        }
      }

      if (stored) {
        try {
          await withTimeout(seedUserNotifications(repo, stored.id), DB_TIMEOUT_MS);
        } catch {
          // Non-fatal.
        }
      }

      if (active) {
        setUserState(stored);
        setReady(true);
      }
    }
    void bootstrap();
    return () => {
      active = false;
    };
  }, []);

  const setUser = useCallback((next: User | null) => {
    setUserState(next);
    if (next) {
      setCookie(COOKIE_NAME, JSON.stringify(next), COOKIE_DAYS);
    } else {
      removeCookie(COOKIE_NAME);
    }
  }, []);

  const value = useMemo<UserContextValue>(
    () => ({ user, setUser, ready }),
    [user, setUser, ready]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useCurrentUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useCurrentUser must be used within a UserProvider");
  }
  return ctx;
}
