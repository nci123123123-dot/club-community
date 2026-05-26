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
      // This fixes stale sessions (e.g. mock UUID that no longer exists in DB).
      if (stored) {
        try {
          const fresh = await repo.findUserByStudentId(stored.studentId);
          if (fresh) {
            // Replace cached data with fresh DB row (id, isAdmin, etc. may differ).
            stored = fresh;
            setCookie(COOKIE_NAME, JSON.stringify(fresh), COOKIE_DAYS);
          } else {
            // Student ID not in DB — clear stale session.
            stored = null;
            removeCookie(COOKIE_NAME);
          }
        } catch {
          // DB unreachable — proceed with cached session as fallback.
        }
      }

      if (stored) {
        try {
          await seedUserNotifications(repo, stored.id);
        } catch {
          // Non-fatal: starter notifications are optional.
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
