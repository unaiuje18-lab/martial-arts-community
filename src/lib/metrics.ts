// Lightweight performance metrics — LCP, TTFB and per-query latency.
// Captured client-side and attached to incident logs so we can correlate
// errors with slow paths (e.g. a 5xx during a slow LCP).

export interface PerfSnapshot {
  lcp?: number; // ms
  ttfb?: number; // ms
  fcp?: number; // ms
  queries: Record<string, { lastMs: number; avgMs: number; count: number }>;
}

const snapshot: PerfSnapshot = { queries: {} };
let installed = false;

export function installPerformanceObservers() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  // TTFB from Navigation Timing
  try {
    const nav = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (nav) snapshot.ttfb = Math.round(nav.responseStart - nav.requestStart);
  } catch {
    /* ignore */
  }

  // LCP — keep the largest, finalize on visibility change
  try {
    const lcpObs = new PerformanceObserver((list) => {
      const last = list.getEntries().at(-1) as PerformanceEntry | undefined;
      if (last) snapshot.lcp = Math.round(last.startTime);
    });
    lcpObs.observe({ type: "largest-contentful-paint", buffered: true });
  } catch {
    /* unsupported */
  }

  // FCP
  try {
    const fcpObs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === "first-contentful-paint") {
          snapshot.fcp = Math.round(entry.startTime);
        }
      }
    });
    fcpObs.observe({ type: "paint", buffered: true });
  } catch {
    /* unsupported */
  }
}

export function recordQueryLatency(key: string, ms: number) {
  const prev = snapshot.queries[key] ?? { lastMs: 0, avgMs: 0, count: 0 };
  const count = prev.count + 1;
  const avgMs = Math.round((prev.avgMs * prev.count + ms) / count);
  snapshot.queries[key] = { lastMs: Math.round(ms), avgMs, count };
}

export async function measureQuery<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    recordQueryLatency(key, performance.now() - start);
  }
}

export function getMetrics(): PerfSnapshot {
  return { ...snapshot, queries: { ...snapshot.queries } };
}