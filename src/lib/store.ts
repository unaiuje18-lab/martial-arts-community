import { useSyncExternalStore } from "react";
import type { TrainingSession, Goal, FeedPost, Duel, Art } from "./mock-data";
import { supabase } from "@/integrations/supabase/client";

// Database types are auto-generated and currently empty for these tables.
// Cast the client to bypass the strict generated schema until types regenerate.
const db = supabase as unknown as {
  from: (t: string) => {
    select: (cols?: string) => {
      order: (col: string, opts?: { ascending?: boolean }) => { limit: (n: number) => Promise<{ data: Record<string, unknown>[] | null; error: { message: string } | null }> };
    };
    insert: (row: Record<string, unknown>) => {
      select: () => { single: () => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }> };
    };
  };
};

const KEY = "strive-state-v2";

export interface Comment {
  id: string;
  postId: string;
  author: string;
  text: string;
  at: number;
}

export interface Achievement {
  id: string;
  kind: "promotion" | "competition" | "milestone";
  title: string;
  detail?: string;
  date: string; // YYYY-MM-DD
  at: number;
}

export interface ScheduleSlot {
  id: string;
  label: string; // e.g. "BJJ", "Kickboxing", "Running"
  days: number[]; // 0=Sun … 6=Sat
  start: string; // "HH:MM" 24h
  end: string;   // "HH:MM" 24h
  location?: string;
  color?: string; // optional CSS color override
}

interface State {
  likes: Record<string, boolean>;
  saves: Record<string, boolean>;
  follows: Record<string, boolean>;
  votes: Record<string, "a" | "b" | null>;
  voteCounts: Record<string, { a: number; b: number }>;
  likeCounts: Record<string, number>;
  commentCounts: Record<string, number>;
  comments: Record<string, Comment[]>;
  sessions: TrainingSession[];
  goals: Goal[];
  userPosts: FeedPost[];
  userDuels: Duel[];
  achievements: Achievement[];
  schedule: ScheduleSlot[];
}

function seed(): State {
  return {
    likes: {},
    saves: {},
    follows: {},
    votes: {},
    voteCounts: {},
    likeCounts: {},
    commentCounts: {},
    comments: {},
    sessions: [],
    goals: [],
    userPosts: [],
    userDuels: [],
    achievements: [],
    schedule: [],
  };
}

// Start from `seed()` on both server and client so the SSR HTML and the
// first client render agree. `hydrateFromStorage()` is called by the app
// shell after mount to swap in the persisted state without hydration mismatch.
let state: State = seed();
let storageHydrated = false;

export function hydrateFromStorage() {
  if (storageHydrated || typeof window === "undefined") return;
  storageHydrated = true;
  const loaded = load();
  if (loaded !== state) {
    state = loaded;
    listeners.forEach((l) => l());
  }
}
const listeners = new Set<() => void>();

// On boot, hydrate user posts/duels from backend so publications survive reloads.
// Errors are swallowed here; routes can opt into a Query-driven hydration with
// visible loading/error states via `fetchBackendFeed` below.
if (typeof window !== "undefined") {
  void hydrateFromBackend().catch(() => {});
}

export interface BackendFeed {
  posts: FeedPost[];
  duels: Duel[];
}

export async function fetchBackendFeed(): Promise<BackendFeed> {
  const [postsRes, duelsRes] = await Promise.all([
    db.from("posts").select("*").order("created_at", { ascending: false }).limit(100),
    db.from("duels").select("*").order("created_at", { ascending: false }).limit(100),
  ]);
  if (postsRes.error) throw new Error(postsRes.error.message);
  if (duelsRes.error) throw new Error(duelsRes.error.message);
  const posts: FeedPost[] = (postsRes.data ?? []).map((r: Record<string, unknown>) => ({
      id: String(r.id),
      handle: String(r.handle),
      meta: "You",
      video: String(r.video),
      poster: String(r.poster),
      caption: String(r.caption),
      tags: (r.tags as string[] | null) ?? [],
      likes: Number(r.likes ?? 0),
      comments: Number(r.comments ?? 0),
      art: r.art as Art,
      level: r.level as FeedPost["level"],
  }));
  const duels: Duel[] = (duelsRes.data ?? []).map((r: Record<string, unknown>) => ({
      id: String(r.id),
      title: String(r.title),
      technique: String(r.technique),
      a: { handle: String(r.a_handle), poster: String(r.a_poster), votes: Number(r.a_votes ?? 0) },
      b: { handle: String(r.b_handle), poster: String(r.b_poster), votes: Number(r.b_votes ?? 0) },
  }));
  return { posts, duels };
}

export function applyBackendFeed({ posts, duels }: BackendFeed) {
  set((s) => ({
      ...s,
    userPosts: posts,
    userDuels: duels,
      likeCounts: {
        ...s.likeCounts,
      ...Object.fromEntries(posts.map((p) => [p.id, p.likes])),
      },
      commentCounts: {
        ...s.commentCounts,
      ...Object.fromEntries(posts.map((p) => [p.id, p.comments])),
      },
      voteCounts: {
        ...s.voteCounts,
      ...Object.fromEntries(duels.map((d) => [d.id, { a: d.a.votes, b: d.b.votes }])),
      },
  }));
}

async function hydrateFromBackend() {
  const data = await fetchBackendFeed();
  applyBackendFeed(data);
}

function load(): State {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw);
    return { ...seed(), ...parsed };
  } catch {
    return seed();
  }
}

function persist() {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(state));
}

function set(updater: (s: State) => State) {
  const prev = state;
  const next = updater(state);
  state = next;
  try {
    persist();
  } catch (e) {
    // rollback on quota errors so the UI can surface the failure
    state = prev;
    listeners.forEach((l) => l());
    throw e;
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(state),
  );
}

// ---- actions ----
export const actions = {
  toggleLike(postId: string) {
    set((s) => {
      const liked = !s.likes[postId];
      return {
        ...s,
        likes: { ...s.likes, [postId]: liked },
        likeCounts: { ...s.likeCounts, [postId]: (s.likeCounts[postId] ?? 0) + (liked ? 1 : -1) },
      };
    });
  },
  toggleSave(postId: string) {
    set((s) => ({ ...s, saves: { ...s.saves, [postId]: !s.saves[postId] } }));
  },
  toggleFollow(handle: string) {
    set((s) => ({ ...s, follows: { ...s.follows, [handle]: !s.follows[handle] } }));
  },
  vote(duelId: string, side: "a" | "b") {
    set((s) => {
      const prev = s.votes[duelId] ?? null;
      const counts = { ...(s.voteCounts[duelId] ?? { a: 0, b: 0 }) };
      if (prev === side) {
        counts[side] = Math.max(0, counts[side] - 1);
        return { ...s, votes: { ...s.votes, [duelId]: null }, voteCounts: { ...s.voteCounts, [duelId]: counts } };
      }
      if (prev) counts[prev] = Math.max(0, counts[prev] - 1);
      counts[side] = counts[side] + 1;
      return { ...s, votes: { ...s.votes, [duelId]: side }, voteCounts: { ...s.voteCounts, [duelId]: counts } };
    });
  },
  addComment(postId: string, text: string) {
    if (!text.trim()) return;
    const c: Comment = {
      id: crypto.randomUUID(),
      postId,
      author: "@kai_zen",
      text: text.trim(),
      at: Date.now(),
    };
    set((s) => ({
      ...s,
      comments: { ...s.comments, [postId]: [c, ...(s.comments[postId] ?? [])] },
      commentCounts: { ...s.commentCounts, [postId]: (s.commentCounts[postId] ?? 0) + 1 },
    }));
  },
  addSession(session: Omit<TrainingSession, "id" | "completed"> & { completed?: boolean }) {
    const full: TrainingSession = {
      ...session,
      id: crypto.randomUUID(),
      completed: session.completed ?? true,
    };
    set((s) => ({ ...s, sessions: [full, ...s.sessions] }));
  },
  toggleSessionComplete(id: string) {
    set((s) => ({
      ...s,
      sessions: s.sessions.map((x) => (x.id === id ? { ...x, completed: !x.completed } : x)),
    }));
  },
  deleteSession(id: string) {
    set((s) => ({ ...s, sessions: s.sessions.filter((x) => x.id !== id) }));
  },
  addScheduleSlot(slot: Omit<ScheduleSlot, "id">) {
    const full: ScheduleSlot = { ...slot, id: crypto.randomUUID() };
    set((s) => ({ ...s, schedule: [...s.schedule, full] }));
    return full;
  },
  updateScheduleSlot(id: string, patch: Partial<ScheduleSlot>) {
    set((s) => ({
      ...s,
      schedule: s.schedule.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }));
  },
  deleteScheduleSlot(id: string) {
    set((s) => ({ ...s, schedule: s.schedule.filter((x) => x.id !== id) }));
  },
  updateGoal(id: string, patch: Partial<Goal>) {
    set((s) => ({ ...s, goals: s.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) }));
  },
  addGoal(goal: Omit<Goal, "id">) {
    set((s) => ({ ...s, goals: [...s.goals, { ...goal, id: crypto.randomUUID() }] }));
  },
  addPost(input: {
    handle: string;
    caption: string;
    video: string;
    poster: string;
    art: Art;
    level: FeedPost["level"];
    tags?: string[];
    videoPath?: string;
    posterPath?: string;
    visibility?: "public" | "private";
  }): Promise<FeedPost> {
    const tags = input.tags?.length ? input.tags : [input.art, input.level];
    return (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sign in to publish");
      const { data, error } = await db
        .from("posts")
        .insert({
          user_id: auth.user.id,
          handle: input.handle,
          caption: input.caption,
          video: input.video,
          poster: input.poster,
          video_path: input.videoPath,
          poster_path: input.posterPath,
          art: input.art,
          level: input.level,
          tags,
          visibility: input.visibility ?? "public",
        })
        .select()
        .single();
      if (error || !data) throw new Error(error?.message ?? "Could not save post");
      const post: FeedPost = {
        id: String(data.id),
        handle: input.handle,
        meta: "You",
        video: input.video,
        poster: input.poster,
        caption: input.caption,
        tags,
        likes: 0,
        comments: 0,
        art: input.art,
        level: input.level,
      };
      set((s) => ({
        ...s,
        userPosts: [post, ...s.userPosts],
        likeCounts: { ...s.likeCounts, [post.id]: 0 },
        commentCounts: { ...s.commentCounts, [post.id]: 0 },
      }));
      return post;
    })();
  },
  addDuel(input: {
    title: string;
    technique: string;
    aHandle: string;
    aPoster: string;
    bHandle: string;
    bPoster: string;
    aPosterPath?: string;
    bPosterPath?: string;
  }): Promise<Duel> {
    return (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sign in to publish");
      const { data, error } = await db
        .from("duels")
        .insert({
          user_id: auth.user.id,
          title: input.title,
          technique: input.technique,
          a_handle: input.aHandle,
          a_poster: input.aPoster,
          a_poster_path: input.aPosterPath,
          b_handle: input.bHandle,
          b_poster: input.bPoster,
          b_poster_path: input.bPosterPath,
        })
        .select()
        .single();
      if (error || !data) throw new Error(error?.message ?? "Could not save duel");
      const duel: Duel = {
        id: String(data.id),
        title: input.title,
        technique: input.technique,
        a: { poster: input.aPoster, handle: input.aHandle, votes: 0 },
        b: { poster: input.bPoster, handle: input.bHandle, votes: 0 },
      };
      set((s) => ({
        ...s,
        userDuels: [duel, ...s.userDuels],
        voteCounts: { ...s.voteCounts, [duel.id]: { a: 0, b: 0 } },
      }));
      return duel;
    })();
  },
  addAchievement(input: Omit<Achievement, "id" | "at">) {
    const a: Achievement = { ...input, id: crypto.randomUUID(), at: Date.now() };
    set((s) => ({ ...s, achievements: [a, ...s.achievements] }));
    return a;
  },
  reset() {
    state = seed();
    persist();
    listeners.forEach((l) => l());
  },
};

// Local-timezone YYYY-MM-DD. Avoids UTC drift that would break streaks
// for users training late at night in negative offsets.
export function localDayKey(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// streak: consecutive days (local TZ) ending today or yesterday with at
// least one COMPLETED session. If the most recent completed session is
// older than yesterday the streak is 0 — it doesn't advance without training.
export function computeStreak(sessions: TrainingSession[]): number {
  const days = new Set(
    sessions.filter((s) => s.completed).map((s) => localDayKey(s.date)),
  );
  if (days.size === 0) return 0;
  const today = new Date();
  const todayKey = localDayKey(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = localDayKey(yesterday);
  // Anchor must be today (preferred) or yesterday; otherwise streak is broken.
  let cursor: Date;
  if (days.has(todayKey)) cursor = today;
  else if (days.has(yesterdayKey)) cursor = yesterday;
  else return 0;
  let streak = 0;
  while (days.has(localDayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function lastTrainingDate(sessions: TrainingSession[]): string | null {
  const done = sessions.filter((s) => s.completed);
  if (!done.length) return null;
  return done
    .map((s) => localDayKey(s.date))
    .sort((a, b) => b.localeCompare(a))[0];
}