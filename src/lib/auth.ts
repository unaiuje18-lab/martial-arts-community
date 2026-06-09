import { useSyncExternalStore } from "react";

const KEY = "strive-user";

export interface LocalUser {
  name: string;
  username: string;
  age?: string;
  arts?: string[];
  level?: string;
  prefs?: string[];
  createdAt: number;
}

const listeners = new Set<() => void>();
let cached: LocalUser | null = read();

function read(): LocalUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LocalUser) : null;
  } catch {
    return null;
  }
}

function emit() {
  cached = read();
  listeners.forEach((l) => l());
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) emit();
  });
}

export const auth = {
  signIn(u: Omit<LocalUser, "createdAt">) {
    const full: LocalUser = { ...u, createdAt: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(full));
    emit();
  },
  signOut() {
    localStorage.removeItem(KEY);
    emit();
  },
  get(): LocalUser | null {
    return cached;
  },
};

export function useUser(): LocalUser | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => cached,
    () => null,
  );
}