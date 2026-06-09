import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Lock, Plus, Trash2, X } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { ARTS, ME, type Art } from "@/lib/mock-data";
import { actions, computeStreak, useStore } from "@/lib/store";

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
  const sessions = useStore((s) => s.sessions);
  const goals = useStore((s) => s.goals);
  const [adding, setAdding] = useState(false);

  const days = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 28 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - (27 - i));
      const iso = date.toISOString().slice(0, 10);
      const dayS = sessions.filter((s) => s.date.slice(0, 10) === iso);
      const effort = dayS.length
        ? Math.round(dayS.reduce((a, s) => a + s.effort, 0) / dayS.length)
        : 0;
      return { iso, day: date.getDate(), effort };
    });
  }, [sessions]);

  const completed = sessions.length;
  const avgEffort = sessions.length
    ? (sessions.reduce((a, s) => a + s.effort, 0) / sessions.length).toFixed(1)
    : "—";
  const consistency = Math.min(100, Math.round((sessions.length / 12) * 100));
  const topArt = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of sessions) counts[s.art] = (counts[s.art] || 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  }, [sessions]);
  const streak = computeStreak(sessions);

  const sorted = [...sessions].sort((a, b) => +new Date(b.date) - +new Date(a.date));

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
            onClick={() => setAdding(true)}
            aria-label="Add session"
            className="size-9 rounded-full bg-accent text-accent-foreground flex items-center justify-center"
          >
            <Plus className="size-4" strokeWidth={2.5} />
          </button>
        </header>

        <div>
          <h1 className="font-display text-4xl uppercase tracking-tight italic">Training Log</h1>
          <p className="text-sm text-muted-foreground">
            Streak {streak || ME.streak} days · Keep it lit.
          </p>
        </div>

        <section className="grid grid-cols-2 gap-3">
          <Recap label="Sessions" value={String(completed)} />
          <Recap label="Consistency" value={`${consistency}%`} accent />
          <Recap label="Avg Effort" value={`${avgEffort}/10`} />
          <Recap label="Top Art" value={topArt} />
        </section>

        <section className="space-y-3">
          <div className="flex justify-between items-baseline">
            <h2 className="font-display text-xl uppercase italic tracking-tight">Last 28 Days</h2>
            <span className="text-[10px] font-mono text-muted-foreground uppercase">
              RPE intensity
            </span>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {days.map((d) => (
              <div
                key={d.iso}
                title={`${d.iso} · RPE ${d.effort}`}
                className="aspect-square rounded-sm border"
                style={
                  d.effort === 0
                    ? {
                        background: "color-mix(in oklch, var(--accent) 0%, transparent)",
                        borderColor: "var(--border)",
                      }
                    : {
                        background: `color-mix(in oklch, var(--accent) ${Math.min(100, d.effort * 10)}%, transparent)`,
                        borderColor: "color-mix(in oklch, var(--accent) 60%, transparent)",
                      }
                }
              />
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl uppercase italic tracking-tight">Goals</h2>
          <div className="space-y-3">
            {goals.map((g) => (
              <div key={g.id} className="bg-card border border-border rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-baseline">
                  <p className="text-sm font-semibold">{g.title}</p>
                  <span className="text-[10px] font-mono text-accent">{g.progress}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={g.progress}
                  onChange={(e) => actions.updateGoal(g.id, { progress: Number(e.target.value) })}
                  className="w-full accent-[var(--accent)]"
                  aria-label={`Adjust progress for ${g.title}`}
                />
                <p className="text-[10px] font-mono text-muted-foreground uppercase">{g.target}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl uppercase italic tracking-tight">Recent Sessions</h2>
          {sorted.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No sessions yet. Tap + to log your first round.
            </p>
          )}
          <div className="space-y-2">
            {sorted.map((s) => {
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
                  <button
                    onClick={() => actions.deleteSession(s.id)}
                    aria-label="Delete session"
                    className="size-8 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {adding && <AddSessionSheet onClose={() => setAdding(false)} />}
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

function AddSessionSheet({ onClose }: { onClose: () => void }) {
  const [art, setArt] = useState<Art>("BJJ");
  const [duration, setDuration] = useState(60);
  const [effort, setEffort] = useState(7);
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const save = () => {
    actions.addSession({
      art,
      durationMin: duration,
      effort,
      notes: notes.trim() || undefined,
      date: new Date(date).toISOString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true">
      <button onClick={onClose} aria-label="Close" className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-h-[90dvh] overflow-y-auto bg-card border-t border-border rounded-t-2xl animate-snap-in">
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card">
          <h3 className="font-display uppercase italic tracking-tight">Log Session</h3>
          <button onClick={onClose} aria-label="Close" className="size-8 rounded-full bg-secondary flex items-center justify-center">
            <X className="size-4" />
          </button>
        </div>
        <div className="p-4 space-y-5">
          <Field label="Discipline">
            <div className="flex flex-wrap gap-2">
              {ARTS.map((a) => (
                <button
                  key={a}
                  onClick={() => setArt(a)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border ${
                    art === a
                      ? "bg-accent text-accent-foreground border-accent"
                      : "bg-secondary border-border text-muted-foreground"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Date">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-accent"
            />
          </Field>
          <Field label={`Duration · ${duration} min`}>
            <input
              type="range"
              min={15}
              max={180}
              step={5}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full accent-[var(--accent)]"
            />
          </Field>
          <Field label={`Effort · RPE ${effort}/10`}>
            <input
              type="range"
              min={1}
              max={10}
              value={effort}
              onChange={(e) => setEffort(Number(e.target.value))}
              className="w-full accent-[var(--accent)]"
            />
          </Field>
          <Field label="Notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Drilled kimuras, sparred 3 rounds…"
              className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-accent resize-none"
            />
          </Field>
          <button
            onClick={save}
            className="w-full py-3 rounded-xl bg-accent text-accent-foreground font-bold uppercase tracking-wide active:scale-[0.98] transition-transform"
          >
            Save Session
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}