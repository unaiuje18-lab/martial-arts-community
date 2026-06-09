import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Lock, Plus } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { SESSIONS, GOALS, ME } from "@/lib/mock-data";

export const Route = createFileRoute("/tracker")({
  head: () => ({
    meta: [
      { title: "STRIVE — Training Tracker" },
      { name: "description", content: "Your private training calendar, goals, and monthly recap." },
    ],
  }),
  component: TrackerPage,
});

function TrackerPage() {
  // Build a 28-day heatmap of training intensity
  const today = new Date();
  const days = Array.from({ length: 28 }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (27 - i));
    const iso = date.toISOString().slice(0, 10);
    const session = SESSIONS.find((s) => s.date.slice(0, 10) === iso);
    return { iso, day: date.getDate(), effort: session?.effort ?? 0 };
  });

  const completed = SESSIONS.length;
  const avgEffort = (SESSIONS.reduce((a, s) => a + s.effort, 0) / SESSIONS.length).toFixed(1);
  const consistency = Math.round((SESSIONS.length / 12) * 100);
  const topArt = "BJJ";

  return (
    <MobileShell>
      <div className="space-y-7 animate-snap-in">
        <header className="flex items-center justify-between">
          <Link
            to="/profile"
            aria-label="Back"
            className="size-9 rounded-full bg-secondary border border-border flex items-center justify-center"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-1">
            <Lock className="size-3" /> Private
          </p>
          <button
            aria-label="Add session"
            className="size-9 rounded-full bg-accent text-accent-foreground flex items-center justify-center"
          >
            <Plus className="size-4" strokeWidth={2.5} />
          </button>
        </header>

        <div>
          <h1 className="font-display text-4xl uppercase tracking-tight italic">Training Log</h1>
          <p className="text-sm text-muted-foreground">Streak {ME.streak} days · Keep it lit.</p>
        </div>

        {/* Recap */}
        <section className="grid grid-cols-2 gap-3">
          <Recap label="Sessions" value={String(completed)} />
          <Recap label="Consistency" value={`${consistency}%`} accent />
          <Recap label="Avg Effort" value={`${avgEffort}/10`} />
          <Recap label="Top Art" value={topArt} />
        </section>

        {/* Heatmap */}
        <section className="space-y-3">
          <div className="flex justify-between items-baseline">
            <h2 className="font-display text-xl uppercase italic tracking-tight">Last 28 Days</h2>
            <span className="text-[10px] font-mono text-muted-foreground uppercase">RPE intensity</span>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {days.map((d) => (
              <div
                key={d.iso}
                title={`${d.iso} · RPE ${d.effort}`}
                className="aspect-square rounded-sm border"
                style={
                  d.effort === 0
                    ? { background: "color-mix(in oklch, var(--accent) 0%, transparent)", borderColor: "var(--border)" }
                    : {
                        background: `color-mix(in oklch, var(--accent) ${Math.min(100, d.effort * 10)}%, transparent)`,
                        borderColor: "color-mix(in oklch, var(--accent) 60%, transparent)",
                      }
                }
              />
            ))}
          </div>
        </section>

        {/* Goals */}
        <section className="space-y-3">
          <h2 className="font-display text-xl uppercase italic tracking-tight">Goals</h2>
          <div className="space-y-3">
            {GOALS.map((g) => (
              <div key={g.id} className="bg-card border border-border rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-baseline">
                  <p className="text-sm font-semibold">{g.title}</p>
                  <span className="text-[10px] font-mono text-accent">{g.progress}%</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-accent transition-all" style={{ width: `${g.progress}%` }} />
                </div>
                <p className="text-[10px] font-mono text-muted-foreground uppercase">{g.target}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Recent sessions */}
        <section className="space-y-3">
          <h2 className="font-display text-xl uppercase italic tracking-tight">Recent Sessions</h2>
          <div className="space-y-2">
            {SESSIONS.map((s) => {
              const date = new Date(s.date);
              return (
                <div
                  key={s.id}
                  className="flex items-center gap-4 p-3 rounded-xl bg-card border border-border border-l-2 border-l-accent"
                >
                  <div className="size-11 rounded-xl bg-accent/10 border border-accent/20 flex flex-col items-center justify-center leading-none shrink-0">
                    <span className="text-[8px] font-mono text-accent uppercase">
                      {date.toLocaleDateString(undefined, { weekday: "short" })}
                    </span>
                    <span className="text-sm font-bold text-accent">{date.getDate()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{s.art}</p>
                    <p className="text-[10px] font-mono text-muted-foreground uppercase">
                      {s.durationMin} min · RPE {s.effort}/10
                      {s.notes ? ` · ${s.notes}` : ""}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </MobileShell>
  );
}

function Recap({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-card border border-border p-4 rounded-2xl">
      <p className="text-[10px] font-mono text-muted-foreground uppercase mb-1">{label}</p>
      <p className={`font-display text-2xl tracking-tight leading-none ${accent ? "text-accent" : ""}`}>
        {value}
      </p>
    </div>
  );
}