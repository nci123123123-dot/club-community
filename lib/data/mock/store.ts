/**
 * SSR-safe key/value persistence. On the client it uses localStorage; during
 * server rendering (or tests where no functional Storage is available) it
 * falls back to an in-memory map so the same code path works everywhere.
 */
const memory = new Map<string, string>();

let cachedStorage: Storage | null | undefined;

function functionalStorage(): Storage | null {
  if (cachedStorage !== undefined) return cachedStorage;
  try {
    const ls = typeof window !== "undefined" ? window.localStorage : undefined;
    if (
      ls &&
      typeof ls.getItem === "function" &&
      typeof ls.setItem === "function" &&
      typeof ls.removeItem === "function"
    ) {
      const probe = "__cc_probe__";
      ls.setItem(probe, "1");
      ls.removeItem(probe);
      cachedStorage = ls;
      return ls;
    }
  } catch {
    // Storage exists but is not usable (private mode, broken stub, quota).
  }
  cachedStorage = null;
  return null;
}

export function read<T>(key: string, fallback: T): T {
  const ls = functionalStorage();
  const raw = ls ? ls.getItem(key) : memory.get(key) ?? null;
  if (raw === null || raw === undefined) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function write<T>(key: string, value: T): void {
  const raw = JSON.stringify(value);
  const ls = functionalStorage();
  if (ls) {
    ls.setItem(key, raw);
  } else {
    memory.set(key, raw);
  }
}

/** Test-only: wipe all persisted state regardless of backend. */
export function resetStore(): void {
  memory.clear();
  const ls = functionalStorage();
  if (ls) {
    try {
      ls.clear();
    } catch {
      // ignore
    }
  }
}

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
