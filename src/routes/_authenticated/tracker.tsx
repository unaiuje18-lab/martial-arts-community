import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { logIncident } from "@/lib/incident";
import { ArrowLeft, ChevronLeft, ChevronRight, Lock, Plus, Trash2, X, Calendar as CalendarIcon, Link2, Image as ImageIcon, ExternalLink } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { ARTS, ME, type Art } from "@/lib/mock-data";
import { actions, computeStreak, lastTrainingDate, localDayKey, useStore, type ScheduleSlot } from "@/lib/store";
import type { TrainingSession } from "@/lib/mock-data";
import { useUser } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/tracker")({
  head: () => ({
    meta: [
      { title: "STRIVE — Training Tracker" },
      { name: "description", content: "Your private training calendar, goals, and monthly recap." },
    ],
  }),
  component: TrackerPage,
  errorComponent: TrackerErrorBoundary,
  notFoundComponent: TrackerNotFound,
});

function TrackerErrorBoundary({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  const inc = useMemo(
    () => logIncident(error, { route: "/tracker", scope: "route-error" }),
    [error],
  );
  useEffect(() => {
    console.error(`[tracker] failed to load (${inc.id})`, error);
    toast.error("No se pudo cargar Tracker", {
      description: `${inc.id} · ${error.message}`,
      action: {
        label: "Reintentar",
        onClick: () => {
          reset();
          router.invalidate();
        },
      },
    });
  }, [inc.id, error, reset, router]);
  return (
    <MobileShell>
      <div className="p-6 space-y-3 text-sm">
        <h1 className="text-lg font-semibold">Tracker no disponible</h1>
        <p className="text-muted-foreground">Incidencia <code>{inc.id}</code>: {error.message}</p>
        <button
          className="rounded-md border px-3 py-1.5"
          onClick={() => { reset(); router.invalidate(); }}
        >
          Reintentar
        </button>
      </div>
    </MobileShell>
  );
}

function TrackerNotFound() {
  useEffect(() => {
    const inc = logIncident("Tracker route not found", { route: "/tracker", scope: "route-not-found" });
    console.warn(`[tracker] not found (${inc.id})`);
    toast.warning("Tracker no encontrado", { description: inc.id });
  }, []);
  return (
    <MobileShell>
      <div className="p-6 text-sm text-muted-foreground">Ruta no encontrada.</div>
    </MobileShell>
  );
}

function TrackerPage() {
  const sessions = useStore((s) => s.sessions);
  const goals = useStore((s) => s.goals);
  const schedule = useStore((s) => s.schedule);
  const user = useUser();
  const [adding, setAdding] = useState(false);
  const [prefillDate, setPrefillDate] = useState<string | null>(null);
  const [monthOffset, setMonthOffset] = useState(0);
  const [editingSlot, setEditingSlot] = useState<ScheduleSlot | null>(null);
  const [addingSlot, setAddingSlot] = useState(false);

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

  if (!user) return <PrivateGate />;

  const sorted = [...sessions].sort((a, b) => +new Date(b.date) - +new Date(a.date));

  // ---- Month calendar ----
  const monthRef = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthOffset]);

  const monthGrid = useMemo(() => {
    const year = monthRef.getFullYear();
    const month = monthRef.getMonth();
    const first = new Date(year, month, 1);
    const startDow = (first.getDay() + 6) % 7; // Monday-first
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: ({ iso: string; day: number; inMonth: boolean } | null)[] = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      cells.push({ iso: date.toISOString().slice(0, 10), day: d, inMonth: true });
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [monthRef]);

  const monthSessions = useMemo(
    () =>
      sessions.filter((s) => {
        const d = new Date(s.date);
        return d.getFullYear() === monthRef.getFullYear() && d.getMonth() === monthRef.getMonth();
      }),
    [sessions, monthRef],
  );

  const monthlyRecap = useMemo(() => {
    const total = monthSessions.length;
    const minutes = monthSessions.reduce((a, s) => a + s.durationMin, 0);
    const avg = total ? (monthSessions.reduce((a, s) => a + s.effort, 0) / total).toFixed(1) : "—";
    const daysInMonth = new Date(
      monthRef.getFullYear(),
      monthRef.getMonth() + 1,
      0,
    ).getDate();
    const activeDays = new Set(monthSessions.map((s) => s.date.slice(0, 10))).size;
    const consistency = Math.round((activeDays / daysInMonth) * 100);
    return { total, minutes, avg, consistency, activeDays, daysInMonth };
  }, [monthSessions, monthRef]);

  const todayIso = new Date().toISOString().slice(0, 10);
  const monthLabel = monthRef.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const openForDate = (iso: string) => {
    setPrefillDate(iso);
    setAdding(true);
  };

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
            onClick={() => { setPrefillDate(null); setAdding(true); }}
            aria-label="Add session"
            className="size-9 rounded-full bg-accent text-accent-foreground flex items-center justify-center"
          >
            <Plus className="size-4" strokeWidth={2.5} />
          </button>
        </header>

        <div>
          <h1 className="font-display text-4xl uppercase tracking-tight italic">Training Log</h1>
          <p className="text-sm text-muted-foreground">
            {user.name.split(" ")[0]} · Streak {streak} {streak === 1 ? "day" : "days"} · Keep it lit.
          </p>
        </div>

        <section className="grid grid-cols-2 gap-3">
          <Recap label="Sessions" value={String(completed)} />
          <Recap label="Consistency" value={`${consistency}%`} accent />
          <Recap label="Avg Effort" value={`${avgEffort}/10`} />
          <Recap label="Top Art" value={topArt} />
        </section>

        <StreakCard sessions={sessions} streak={streak} />

        <WeeklySchedule
          schedule={schedule}
          onAdd={() => setAddingSlot(true)}
          onEdit={(slot) => setEditingSlot(slot)}
        />

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl uppercase italic tracking-tight">Calendar</h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMonthOffset((m) => m - 1)}
                aria-label="Previous month"
                className="size-7 rounded-full bg-secondary border border-border flex items-center justify-center"
              >
                <ChevronLeft className="size-3.5" />
              </button>
              <span className="text-[10px] font-mono uppercase tracking-widest w-28 text-center">
                {monthLabel}
              </span>
              <button
                onClick={() => setMonthOffset((m) => m + 1)}
                aria-label="Next month"
                disabled={monthOffset >= 0}
                className="size-7 rounded-full bg-secondary border border-border flex items-center justify-center disabled:opacity-30"
              >
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-[9px] font-mono uppercase text-muted-foreground tracking-widest">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <div key={i} className="text-center">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthGrid.map((cell, i) => {
              if (!cell) return <div key={i} className="aspect-square" />;
              const daySessions = sessions.filter((s) => s.date.slice(0, 10) === cell.iso);
              const effort = daySessions.length
                ? Math.round(daySessions.reduce((a, s) => a + s.effort, 0) / daySessions.length)
                : 0;
              const isToday = cell.iso === todayIso;
              const isFuture = cell.iso > todayIso;
              return (
                <button
                  key={cell.iso}
                  onClick={() => !isFuture && openForDate(cell.iso)}
                  disabled={isFuture}
                  className={`aspect-square rounded-md border text-[10px] font-mono flex flex-col items-center justify-center gap-0.5 transition-colors ${
                    isToday ? "border-accent ring-1 ring-accent/40" : "border-border"
                  } ${isFuture ? "opacity-30" : "active:scale-95"}`}
                  style={
                    effort > 0
                      ? {
                          background: `color-mix(in oklch, var(--accent) ${Math.min(100, effort * 10)}%, transparent)`,
                        }
                      : undefined
                  }
                  aria-label={`${cell.iso} ${daySessions.length} sessions`}
                >
                  <span className={effort > 5 ? "text-accent-foreground font-bold" : ""}>
                    {cell.day}
                  </span>
                  {daySessions.length > 0 && (
                    <span className="size-1 rounded-full bg-current opacity-70" />
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex justify-between items-baseline">
            <h2 className="font-display text-xl uppercase italic tracking-tight">Monthly Recap</h2>
            <span className="text-[10px] font-mono text-muted-foreground uppercase">{monthLabel}</span>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <MiniStat label="Sessions" value={String(monthlyRecap.total)} />
              <MiniStat label="Minutes" value={String(monthlyRecap.minutes)} />
              <MiniStat label="Avg RPE" value={`${monthlyRecap.avg}`} />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-mono uppercase tracking-widest">
                <span className="text-muted-foreground">Consistency</span>
                <span className="text-accent">
                  {monthlyRecap.activeDays}/{monthlyRecap.daysInMonth} days · {monthlyRecap.consistency}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-accent transition-all"
                  style={{ width: `${monthlyRecap.consistency}%` }}
                />
              </div>
            </div>
          </div>
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
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl uppercase italic tracking-tight">Goals</h2>
            <button
              onClick={() => {
                const title = prompt("Goal title (e.g. Improve guard passing)");
                if (!title) return;
                const target = prompt("Target (e.g. 4× per week)") ?? "";
                actions.addGoal({ title, target, progress: 0 });
              }}
              className="text-[10px] font-mono uppercase text-accent tracking-widest"
            >
              + Add
            </button>
          </div>
          <div className="space-y-3">
            {goals.map((g) => (
              <div key={g.id} className="bg-card border border-border rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-baseline gap-2">
                  <p className="text-sm font-semibold">{g.title}</p>
                  <span className="text-[10px] font-mono text-accent">{g.progress}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all"
                    style={{ width: `${g.progress}%` }}
                  />
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
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-mono text-muted-foreground uppercase">{g.target}</p>
                </div>
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

      {adding && (
        <AddSessionSheet
          initialDate={prefillDate ?? new Date().toISOString().slice(0, 10)}
          onClose={() => { setAdding(false); setPrefillDate(null); }}
        />
      )}
      {(addingSlot || editingSlot) && (
        <ScheduleSlotSheet
          initial={editingSlot}
          onClose={() => { setAddingSlot(false); setEditingSlot(null); }}
        />
      )}
    </MobileShell>
  );
}

function PrivateGate() {
  return (
    <MobileShell>
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center space-y-6 animate-snap-in px-4">
        <div className="size-16 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center">
          <Lock className="size-7 text-accent" />
        </div>
        <div className="space-y-2">
          <h1 className="font-display text-3xl uppercase italic tracking-tight">Private Tracker</h1>
          <p className="text-sm text-muted-foreground max-w-xs">
            Your training log is only visible to you. Create your fighter profile to unlock it.
          </p>
        </div>
        <Link
          to="/onboarding"
          className="px-6 py-3 rounded-full bg-accent text-accent-foreground font-bold uppercase tracking-wide text-sm"
        >
          Create Profile
        </Link>
      </div>
    </MobileShell>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
        {label}
      </p>
      <p className="font-display text-xl leading-none">{value}</p>
    </div>
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

function StreakCard({ sessions, streak }: { sessions: TrainingSession[]; streak: number }) {
  const last = lastTrainingDate(sessions);
  const todayKey = localDayKey(new Date());
  const yest = new Date();
  yest.setDate(yest.getDate() - 1);
  const yKey = localDayKey(yest);
  const trainedToday = last === todayKey;
  const status = !last
    ? "No training yet — log your first session."
    : trainedToday
      ? "Trained today · streak is live"
      : last === yKey
        ? "Trained yesterday · train today to keep it"
        : "Streak reset — train today to start again";
  const lastLabel = last
    ? new Date(last).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })
    : "—";
  return (
    <section className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 via-card to-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl uppercase italic tracking-tight">Streak</h2>
        <span
          className={`text-[10px] font-mono uppercase tracking-widest ${
            trainedToday ? "text-accent" : "text-muted-foreground"
          }`}
        >
          {trainedToday ? "● live" : "○ pending"}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-5xl tracking-tight text-accent leading-none">
          {streak}
        </span>
        <span className="text-sm text-muted-foreground">
          {streak === 1 ? "day in a row" : "days in a row"}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 pt-1">
        <MiniStat label="Last session" value={lastLabel} />
        <MiniStat label="Today" value={trainedToday ? "Done" : "Pending"} />
      </div>
      <p className="text-[11px] text-muted-foreground">{status}</p>
    </section>
  );
}

function AddSessionSheet({ onClose, initialDate }: { onClose: () => void; initialDate: string }) {
  const [art, setArt] = useState<Art>("BJJ");
  const [duration, setDuration] = useState(60);
  const [effort, setEffort] = useState(7);
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(initialDate);
  const [completed, setCompleted] = useState(true);
  const [activity, setActivity] = useState("");
  const [stravaUrl, setStravaUrl] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);
  const photoRef = useRef<HTMLInputElement>(null);

  const onPickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 3 * 1024 * 1024) { toast.error("Image too large (max 3MB)"); return; }
    const reader = new FileReader();
    reader.onload = () => setPhotoUrl(reader.result as string);
    reader.readAsDataURL(f);
  };

  const save = () => {
    const url = stravaUrl.trim();
    if (url && !/^https?:\/\//i.test(url)) {
      toast.error("Strava link must start with http(s)://");
      return;
    }
    actions.addSession({
      art,
      durationMin: duration,
      effort,
      notes: notes.trim() || undefined,
      date: new Date(date).toISOString(),
      completed,
      activity: activity.trim() || undefined,
      stravaUrl: url || undefined,
      photoUrl,
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
          <Field label="Status">
            <div className="flex gap-2">
              <button
                onClick={() => setCompleted(true)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wide border ${
                  completed ? "bg-accent text-accent-foreground border-accent" : "bg-secondary border-border text-muted-foreground"
                }`}
              >
                Completed
              </button>
              <button
                onClick={() => setCompleted(false)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wide border ${
                  !completed ? "bg-accent text-accent-foreground border-accent" : "bg-secondary border-border text-muted-foreground"
                }`}
              >
                Planned
              </button>
            </div>
          </Field>
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
          <Field label="Custom activity (optional)">
            <input
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
              placeholder="Running, Swimming, Yoga…"
              maxLength={40}
              className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-accent"
            />
          </Field>
          <Field label="Strava link (optional)">
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                value={stravaUrl}
                onChange={(e) => setStravaUrl(e.target.value)}
                placeholder="https://www.strava.com/activities/…"
                inputMode="url"
                className="w-full bg-secondary rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </Field>
          <Field label="Photo (optional)">
            <input ref={photoRef} type="file" accept="image/*" onChange={onPickPhoto} className="hidden" />
            {photoUrl ? (
              <div className="relative">
                <img src={photoUrl} alt="Session" className="w-full h-40 object-cover rounded-lg" />
                <button
                  type="button"
                  onClick={() => setPhotoUrl(undefined)}
                  className="absolute top-2 right-2 size-7 rounded-full bg-black/60 text-white flex items-center justify-center"
                  aria-label="Remove photo"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => photoRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-dashed border-border text-xs font-mono uppercase tracking-wider text-muted-foreground"
              >
                <ImageIcon className="size-4" /> Add photo (max 3MB)
              </button>
            )}
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