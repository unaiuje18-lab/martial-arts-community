import { useSyncExternalStore } from "react";
import avatar1 from "@/assets/avatar-1.jpg";

const PREFIX = "strive-user:";
const LEGACY_KEY = "strive-user";

export interface LocalUser {
  id?: string; // matches auth.users.id when signed in
  name: string;
  username: string;
  age?: string;
  birthday?: string; // YYYY-MM-DD
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
let activeUserId: string | null = null;
let cached: LocalUser | null = readActive();

function keyFor(uid: string | null): string {
  return uid ? `${PREFIX}${uid}` : LEGACY_KEY;
}

function readActive(): LocalUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(keyFor(activeUserId));
    if (raw) return JSON.parse(raw) as LocalUser;
    // Legacy migration: if signed in but no per-user record, adopt the legacy one once.
    if (activeUserId) {
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        const parsed = JSON.parse(legacy) as LocalUser;
        localStorage.setItem(keyFor(activeUserId), JSON.stringify({ ...parsed, id: activeUserId }));
        return { ...parsed, id: activeUserId };
      }
    }
    return null;
  } catch {
    return null;
  }
}

function emit() {
  cached = readActive();
  listeners.forEach((l) => l());
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key && (e.key === LEGACY_KEY || e.key.startsWith(PREFIX))) emit();
  });
}

export const auth = {
  setActiveUserId(uid: string | null) {
    if (activeUserId === uid) return;
    activeUserId = uid;
    emit();
  },
  getActiveUserId() {
    return activeUserId;
  },
  signIn(u: Omit<LocalUser, "createdAt">) {
    const full: LocalUser = {
      ...u,
      id: u.id ?? activeUserId ?? undefined,
      avatar: u.avatar ?? avatar1,
      bio: u.bio ?? "",
      createdAt: Date.now(),
    };
    const uid = full.id ?? activeUserId;
    if (uid && !activeUserId) activeUserId = uid;
    localStorage.setItem(keyFor(uid ?? null), JSON.stringify(full));
    emit();
  },
  update(patch: Partial<LocalUser>) {
    const current = readActive();
    if (!current) return;
    const next: LocalUser = { ...current, ...patch };
    localStorage.setItem(keyFor(activeUserId), JSON.stringify(next));
    emit();
  },
  signOut() {
    // Don't wipe the per-user data — keep it so the next sign-in restores onboarding.
    activeUserId = null;
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