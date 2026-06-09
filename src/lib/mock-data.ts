import feed1 from "@/assets/feed-1.jpg";
import feed2 from "@/assets/feed-2.jpg";
import feed3 from "@/assets/feed-3.jpg";
import duelA from "@/assets/duel-a.jpg";
import duelB from "@/assets/duel-b.jpg";
import avatar1 from "@/assets/avatar-1.jpg";

export type Art =
  | "Boxing"
  | "BJJ"
  | "Judo"
  | "Wrestling"
  | "Kickboxing"
  | "MMA"
  | "Muay Thai"
  | "Karate";

export const ARTS: Art[] = [
  "Boxing",
  "BJJ",
  "Judo",
  "Wrestling",
  "Kickboxing",
  "MMA",
  "Muay Thai",
  "Karate",
];

export const LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;

export const CONTENT_PREFS = [
  "Techniques",
  "Fights",
  "Analysis",
  "Tutorials",
  "Motivation",
  "Conditioning",
] as const;

export interface FeedPost {
  id: string;
  poster: string;
  handle: string;
  meta: string;
  caption: string;
  tags: string[];
  likes: number;
  comments: number;
  art: Art;
  level: (typeof LEVELS)[number];
}

export const FEED: FeedPost[] = [
  {
    id: "1",
    poster: feed1,
    handle: "@marcus_striking",
    meta: "Pro • Welterweight",
    caption:
      "Tightening the switch kick mechanics. Focus on the hip turnover. #muaythai #technique",
    tags: ["Kickboxing", "Advanced"],
    likes: 12400,
    comments: 428,
    art: "Muay Thai",
    level: "Advanced",
  },
  {
    id: "2",
    poster: feed2,
    handle: "@kai_zen",
    meta: "Brown belt • No-Gi",
    caption:
      "Kimura from half guard — controlling the head before the grip. Drill this 20 reps each side.",
    tags: ["BJJ", "Intermediate"],
    likes: 8210,
    comments: 312,
    art: "BJJ",
    level: "Intermediate",
  },
  {
    id: "3",
    poster: feed3,
    handle: "@iron_jab",
    meta: "Amateur • Lightweight",
    caption:
      "5 boxing combinations every beginner should drill. Shadow box this twice a week.",
    tags: ["Boxing", "Beginner"],
    likes: 5430,
    comments: 190,
    art: "Boxing",
    level: "Beginner",
  },
];

export interface Duel {
  id: string;
  title: string;
  technique: string;
  a: { poster: string; handle: string; votes: number };
  b: { poster: string; handle: string; votes: number };
}

export const DUELS: Duel[] = [
  {
    id: "d1",
    title: "Which armbar finish is cleaner?",
    technique: "Armbar from guard",
    a: { poster: duelA, handle: "@kai_zen", votes: 1280 },
    b: { poster: duelB, handle: "@gracie_a", votes: 720 },
  },
  {
    id: "d2",
    title: "Sharper switch kick?",
    technique: "Switch kick",
    a: { poster: feed1, handle: "@marcus_striking", votes: 940 },
    b: { poster: feed3, handle: "@iron_jab", votes: 1110 },
  },
];

export interface TrainingSession {
  id: string;
  date: string; // ISO
  art: Art;
  durationMin: number;
  effort: number; // 1-10
  notes?: string;
  completed: boolean;
}

const today = new Date();
const d = (offsetDays: number) => {
  const x = new Date(today);
  x.setDate(x.getDate() - offsetDays);
  return x.toISOString();
};

export const SESSIONS: TrainingSession[] = [
  { id: "s1", date: d(0), art: "BJJ", durationMin: 90, effort: 8, notes: "Drilled kimura entries", completed: true },
  { id: "s2", date: d(1), art: "Kickboxing", durationMin: 60, effort: 7, completed: true },
  { id: "s3", date: d(2), art: "BJJ", durationMin: 75, effort: 6, completed: true },
  { id: "s4", date: d(4), art: "Boxing", durationMin: 45, effort: 9, completed: true },
  { id: "s5", date: d(6), art: "MMA", durationMin: 90, effort: 8, completed: true },
  { id: "s6", date: d(8), art: "BJJ", durationMin: 90, effort: 7, completed: true },
  { id: "s7", date: d(10), art: "Kickboxing", durationMin: 60, effort: 6, completed: true },
];

export interface Goal {
  id: string;
  title: string;
  progress: number; // 0-100
  target: string;
}

export const GOALS: Goal[] = [
  { id: "g1", title: "Train 4× per week", progress: 75, target: "3 / 4 this week" },
  { id: "g2", title: "Improve guard passing", progress: 40, target: "12 / 30 drills" },
  { id: "g3", title: "Lose 3 kg", progress: 60, target: "1.8 / 3 kg" },
];

export interface Badge {
  id: string;
  label: string;
  earned: boolean;
}

export const BADGES: Badge[] = [
  { id: "b1", label: "First Upload", earned: true },
  { id: "b2", label: "10 in a Row", earned: true },
  { id: "b3", label: "First Competition", earned: false },
  { id: "b4", label: "Iron Will", earned: true },
  { id: "b5", label: "Strategist", earned: false },
  { id: "b6", label: "First Blood", earned: false },
];

export const ME = {
  name: "Elias Thorne",
  username: "kai_zen",
  bio: "BJJ brown belt. Striker by night. Drilling kimuras until the end of time.",
  avatar: avatar1,
  level: 24,
  xp: 2440,
  xpToNext: 3500,
  streak: 14,
  arts: ["BJJ", "Muay Thai"] as Art[],
  followers: 1240,
  following: 312,
};

export const TRENDING = [
  "Kimura from half guard",
  "Switch kick mechanics",
  "Jab-cross-hook for beginners",
  "Single leg takedown",
  "Triangle from closed guard",
  "Liver shot setup",
];

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}