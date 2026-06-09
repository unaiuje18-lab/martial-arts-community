import { createFileRoute, Link } from "@tanstack/react-router";
import { Settings, Lock, Flame, Award } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { ME, BADGES, SESSIONS, formatCount } from "@/lib/mock-data";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "STRIVE — Profile" },
      { name: "description", content: "Your fighter profile, achievements, and stats." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const xpPct = Math.round((ME.xp / ME.xpToNext) * 100);

  return (
    <MobileShell>
      <div className="space-y-7 animate-snap-in">
        <header className="flex items-start justify-between">
          <h1 className="font-display text-4xl uppercase tracking-tight italic">Profile</h1>
          <button
            aria-label="Settings"
            className="size-9 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground"
          >
            <Settings className="size-4" />
          </button>
        </header>

        {/* Identity */}
        <section className="flex items-start gap-4">
          <img
            src={ME.avatar}
            alt={ME.name}
            width={80}
            height={80}
            className="size-20 rounded-2xl object-cover border-4 border-white/5"
          />
          <div className="flex-1 pt-1 space-y-1">
            <h2 className="font-display text-2xl uppercase tracking-tight leading-none">{ME.name}</h2>
            <p className="text-xs font-mono text-muted-foreground">@{ME.username}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-accent font-mono text-xs font-bold">LVL {ME.level}</span>
              <div className="w-28 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-accent" style={{ width: `${xpPct}%` }} />
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">{ME.xp}/{ME.xpToNext}</span>
            </div>
          </div>
        </section>

        <p className="text-sm text-foreground/80 text-pretty">{ME.bio}</p>

        <div className="flex gap-2 flex-wrap">
          {ME.arts.map((a) => (
            <span key={a} className="px-2.5 py-1 bg-secondary border border-border rounded text-[10px] font-bold uppercase tracking-wide">
              {a}
            </span>
          ))}
        </div>

        {/* Follow stats */}
        <div className="flex items-center gap-6 text-sm">
          <div><span className="font-bold">{formatCount(ME.followers)}</span> <span className="text-muted-foreground">followers</span></div>
          <div><span className="font-bold">{formatCount(ME.following)}</span> <span className="text-muted-foreground">following</span></div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Streak" value={`${ME.streak}D`} accent />
          <Stat label="Sessions" value={String(SESSIONS.length + 121)} />
          <Stat label="XP" value={formatCount(ME.xp)} />
        </div>

        {/* Private tracker entry */}
        <Link
          to="/tracker"
          className="block w-full rounded-2xl bg-gradient-to-br from-primary/30 via-card to-card border border-primary/30 p-4 active:scale-[0.99] transition-transform"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Flame className="size-5 text-accent" />
              </div>
              <div>
                <p className="font-semibold text-sm">Private Training Tracker</p>
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Lock className="size-3" /> Only visible to you
                </p>
              </div>
            </div>
            <span className="text-accent text-xs font-bold">OPEN</span>
          </div>
        </Link>

        {/* Badges */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl uppercase italic tracking-tight">Badges</h3>
            <span className="text-[10px] font-mono text-muted-foreground">
              {BADGES.filter((b) => b.earned).length}/{BADGES.length}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {BADGES.map((b) => (
              <div
                key={b.id}
                className={`aspect-square rounded-xl border flex flex-col items-center justify-center p-2 gap-1.5 text-center ${
                  b.earned
                    ? "bg-accent/10 border-accent/30"
                    : "bg-secondary/40 border-border opacity-50"
                }`}
              >
                <Award className={`size-6 ${b.earned ? "text-accent" : "text-muted-foreground"}`} />
                <p className={`text-[9px] font-mono uppercase leading-tight ${b.earned ? "text-foreground" : "text-muted-foreground"}`}>
                  {b.label}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </MobileShell>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-card border border-border p-4 rounded-2xl">
      <p className="text-[10px] font-mono text-muted-foreground uppercase mb-1">{label}</p>
      <p className={`font-display text-2xl tracking-tight leading-none ${accent ? "text-accent" : ""}`}>
        {value}
      </p>
    </div>
  );
}