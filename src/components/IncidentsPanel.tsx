import { useEffect, useState, useSyncExternalStore } from "react";
import { Bug, X, Trash2, Activity } from "lucide-react";
import {
  getRecentIncidents,
  subscribeIncidents,
  clearIncidents,
  type IncidentRecord,
} from "@/lib/incident";
import { getMetrics } from "@/lib/metrics";

function useIncidents(): IncidentRecord[] {
  return useSyncExternalStore(
    (l) => subscribeIncidents(l),
    () => getRecentIncidents(),
    () => [],
  );
}

export function IncidentsPanel() {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const incidents = useIncidents();

  useEffect(() => {
    // Show in dev, or when ?debug=1, or after pressing Ctrl/Cmd+Shift+I-ncidents (Alt+I)
    const params = new URLSearchParams(window.location.search);
    const isDev = import.meta.env?.DEV === true;
    const flagged = params.get("debug") === "1" || localStorage.getItem("strive:debug") === "1";
    setEnabled(isDev || flagged);
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "i" || e.key === "I")) {
        localStorage.setItem("strive:debug", "1");
        setEnabled(true);
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!enabled) return null;

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open incidents panel"
        className="fixed bottom-24 right-3 z-[60] size-10 rounded-full bg-zinc-900/90 border border-white/10 text-white flex items-center justify-center shadow-lg backdrop-blur"
      >
        <Bug className="size-4" />
        {incidents.length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center">
            {incidents.length}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-3 bottom-36 top-16 z-[60] rounded-xl bg-zinc-950/95 backdrop-blur border border-white/10 text-white flex flex-col shadow-2xl">
          <header className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-accent" />
              <h2 className="text-sm font-semibold">Incidents · {incidents.length}</h2>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={clearIncidents}
                className="size-8 rounded-md hover:bg-white/10 flex items-center justify-center"
                aria-label="Clear"
              >
                <Trash2 className="size-4" />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="size-8 rounded-md hover:bg-white/10 flex items-center justify-center"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>
          </header>
          <MetricsRow />
          <div className="flex-1 overflow-y-auto divide-y divide-white/5">
            {incidents.length === 0 && (
              <p className="text-xs text-white/50 p-6 text-center">
                No incidents recorded. Errors will appear here with an INC id.
              </p>
            )}
            {incidents.map((inc) => (
              <IncidentRow key={inc.id} inc={inc} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function MetricsRow() {
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 1500);
    return () => clearInterval(t);
  }, []);
  const m = getMetrics();
  const queries = Object.entries(m.queries);
  return (
    <div className="px-4 py-2 border-b border-white/10 text-[11px] font-mono text-white/70 grid grid-cols-3 gap-2">
      <span>TTFB: <b className="text-white">{m.ttfb ?? "—"}ms</b></span>
      <span>FCP: <b className="text-white">{m.fcp ?? "—"}ms</b></span>
      <span>LCP: <b className="text-white">{m.lcp ?? "—"}ms</b></span>
      {queries.length > 0 && (
        <span className="col-span-3 truncate">
          {queries.map(([k, v]) => `${k}: ${v.lastMs}ms (avg ${v.avgMs}, n=${v.count})`).join(" · ")}
        </span>
      )}
    </div>
  );
}

function IncidentRow({ inc }: { inc: IncidentRecord }) {
  const [expanded, setExpanded] = useState(false);
  const time = new Date(inc.at).toLocaleTimeString();
  return (
    <button
      onClick={() => setExpanded((v) => !v)}
      className="w-full text-left px-4 py-3 hover:bg-white/5"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[11px] text-accent">{inc.id}</span>
        <span className="font-mono text-[10px] text-white/50">{time}</span>
      </div>
      <p className="text-xs text-white mt-1 truncate">{inc.message}</p>
      <p className="text-[10px] font-mono text-white/50 mt-0.5">
        {inc.route ?? "—"} · LCP {inc.metrics?.lcp ?? "—"}ms · TTFB {inc.metrics?.ttfb ?? "—"}ms
      </p>
      {expanded && (
        <pre className="mt-2 text-[10px] font-mono whitespace-pre-wrap break-words text-white/60 bg-black/40 p-2 rounded max-h-48 overflow-auto">
          {JSON.stringify({ context: inc.context, metrics: inc.metrics, stack: inc.stack }, null, 2)}
        </pre>
      )}
    </button>
  );
}