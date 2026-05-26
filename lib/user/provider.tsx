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

const STORAGE_KEY = "cc.currentUser";

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
      // Sample seeding targets the mock backend; skip it for Supabase.
      if (process.env.NEXT_PUBLIC_DATA_SOURCE !== "supabase") {
        try {
          await seedRepository(repo);
        } catch {
          // Non-fatal: app still works without sample data.
        }
      }
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const stored = raw ? (JSON.parse(raw) as User) : null;
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
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
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
