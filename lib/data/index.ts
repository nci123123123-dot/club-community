import type { DataRepository } from "./repository";
import { MockRepository } from "./mock";
import { SupabaseRepository } from "./supabase";

let instance: DataRepository | null = null;

/**
 * Returns the active data repository, chosen by NEXT_PUBLIC_DATA_SOURCE.
 * Defaults to the mock (localStorage) backend so the app runs with no setup.
 */
export function getRepository(): DataRepository {
  if (instance) return instance;
  const source = process.env.NEXT_PUBLIC_DATA_SOURCE;
  instance = source === "supabase" ? new SupabaseRepository() : new MockRepository();
  return instance;
}

export type { DataRepository, Voter } from "./repository";
