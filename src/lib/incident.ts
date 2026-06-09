// Lightweight incident logging used by error boundaries, global handlers and
// recoverable UI surfaces (feed banner, toasts). Keeps a small in-memory ring
// buffer so the user can quote an id when reporting a problem.

import { getMetrics, type PerfSnapshot } from "./metrics";

export interface IncidentRecord {
  id: string;
  at: number;
  message: string;
  context: Record<string, unknown>;
  stack?: string;
  route?: string;
  metrics?: PerfSnapshot;
}

const MAX = 25;
const recent: IncidentRecord[] = [];
let snapshot: IncidentRecord[] = [];
const listeners = new Set<() => void>();

function refreshSnapshot() {
  snapshot = recent.slice();
}

function newId(): string {
  // Short, human-quotable id. INC-XXXXXX
  const rnd =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 6)
      : Math.random().toString(36).slice(2, 8);
  return `INC-${rnd.toUpperCase()}`;
}

export function logIncident(
  error: unknown,
  context: Record<string, unknown> = {},
): IncidentRecord {
  const err =
    error instanceof Error
      ? error
      : new Error(typeof error === "string" ? error : JSON.stringify(error));
  const record: IncidentRecord = {
    id: newId(),
    at: Date.now(),
    message: err.message || "Unknown error",
    stack: err.stack,
    context,
    route: typeof window !== "undefined" ? window.location.pathname : undefined,
    metrics: typeof window !== "undefined" ? getMetrics() : undefined,
  };
  recent.unshift(record);
  if (recent.length > MAX) recent.length = MAX;
  refreshSnapshot();
  if (typeof console !== "undefined") {
    console.error(`[${record.id}]`, err, { ...context, metrics: record.metrics });
  }
  listeners.forEach((l) => l());
  return record;
}

export function getRecentIncidents(): IncidentRecord[] {
  return snapshot;
}

export function subscribeIncidents(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function clearIncidents() {
  recent.length = 0;
  refreshSnapshot();
  listeners.forEach((l) => l());
}