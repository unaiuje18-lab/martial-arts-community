import { useSyncExternalStore } from "react";
import { SESSIONS, GOALS, DUELS, FEED, type TrainingSession, type Goal, type FeedPost, type Duel, type Art } from "./mock-data";
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

const KEY = "strive-state-v1";

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
}

function seed(): State {
  return {
    likes: {},
    saves: {},
    follows: {},
    votes: {},
    voteCounts: Object.fromEntries(DUELS.map((d) => [d.id, { a: d.a.votes, b: d.b.votes }])),
    likeCounts: Object.fromEntries(FEED.map((p) => [p.id, p.likes])),
    commentCounts: Object.fromEntries(FEED.map((p) => [p.id, p.comments])),
    comments: {},
    sessions: [...SESSIONS],
    goals: [...GOALS],
    userPosts: [],
    userDuels: [],
    achievements: [],
  };
}

let state: State = load();
const listeners = new Set<() => void>();

// On boot, hydrate user posts/duels from backend so publications survive reloads.
if (typeof window !== "undefined") {
  void hydrateFromBackend();
}

async function hydrateFromBackend() {
  try {
    const [{ data: posts }, { data: duels }] = await Promise.all([
      db.from("posts").select("*").order("created_at", { ascending: false }).limit(100),
      db.from("duels").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    const remotePosts: FeedPost[] = (posts ?? []).map((r: Record<string, unknown>) => ({
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
    const remoteDuels: Duel[] = (duels ?? []).map((r: Record<string, unknown>) => ({
      id: String(r.id),
      title: String(r.title),
      technique: String(r.technique),
      a: { handle: String(r.a_handle), poster: String(r.a_poster), votes: Number(r.a_votes ?? 0) },
      b: { handle: String(r.b_handle), poster: String(r.b_poster), votes: Number(r.b_votes ?? 0) },
    }));
    set((s) => ({
      ...s,
      userPosts: remotePosts,
      userDuels: remoteDuels,
      likeCounts: {
        ...s.likeCounts,
        ...Object.fromEntries(remotePosts.map((p) => [p.id, p.likes])),
      },
      commentCounts: {
        ...s.commentCounts,
        ...Object.fromEntries(remotePosts.map((p) => [p.id, p.comments])),
      },
      voteCounts: {
        ...s.voteCounts,
        ...Object.fromEntries(remoteDuels.map((d) => [d.id, { a: d.a.votes, b: d.b.votes }])),
      },
    }));
  } catch {
    /* offline / network — keep local state */
  }
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
  }): Promise<FeedPost> {
    const tags = input.tags?.length ? input.tags : [input.art, input.level];
    return (async () => {
      const { data, error } = await db
        .from("posts")
        .insert({
          handle: input.handle,
          caption: input.caption,
          video: input.video,
          poster: input.poster,
          video_path: input.videoPath,
          poster_path: input.posterPath,
          art: input.art,
          level: input.level,
          tags,
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
      const { data, error } = await db
        .from("duels")
        .insert({
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

// streak: count consecutive days ending today with at least one session
export function computeStreak(sessions: TrainingSession[]): number {
  const days = new Set(sessions.map((s) => s.date.slice(0, 10)));
  let streak = 0;
  const d = new Date();
  while (days.has(d.toISOString().slice(0, 10))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}