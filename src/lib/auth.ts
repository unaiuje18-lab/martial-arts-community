import { useSyncExternalStore } from "react";
import avatar1 from "@/assets/avatar-1.jpg";

const KEY = "strive-user";

export interface LocalUser {
  name: string;
  username: string;
  age?: string;
  arts?: string[];
  level?: string;
  prefs?: string[];
  bio?: string;
  avatar?: string;
  ranks?: Record<
    string,
    {
      type: "belt" | "years";
      value: string;
      system?: string;
      history?: { belt: string; date: string }[]; // date as YYYY-MM
    }
  >;
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
    const full: LocalUser = {
      ...u,
      avatar: u.avatar ?? avatar1,
      bio: u.bio ?? "",
      createdAt: Date.now(),
    };
    localStorage.setItem(KEY, JSON.stringify(full));
    emit();
  },
  update(patch: Partial<LocalUser>) {
    const current = read();
    if (!current) return;
    const next: LocalUser = { ...current, ...patch };
    localStorage.setItem(KEY, JSON.stringify(next));
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