import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle, CheckCircle2 } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { DUELS, formatCount, type Duel } from "@/lib/mock-data";
import { actions, useStore } from "@/lib/store";

export const Route = createFileRoute("/duels")({
  head: () => ({
    meta: [
      { title: "STRIVE — Technique Duels" },
      { name: "description", content: "Vote on which technique execution is cleaner. Community-judged." },
    ],
  }),
  component: DuelsPage,
});

function DuelsPage() {
  return (
    <MobileShell>
      <div className="space-y-8 animate-snap-in">
        <header className="space-y-1">
          <p className="text-[10px] font-mono text-accent uppercase tracking-widest">Community judged</p>
          <h1 className="font-display text-4xl uppercase tracking-tight italic">Technique Duels</h1>
          <p className="text-sm text-muted-foreground">Pick the cleaner execution. Results update live.</p>
        </header>

        <div className="space-y-8">
          {DUELS.map((d) => (
            <DuelCard key={d.id} duel={d} />
          ))}
        </div>
      </div>
    </MobileShell>
  );
}

function DuelCard({ duel }: { duel: Duel }) {
  const vote = useStore((s) => s.votes[duel.id] ?? null);
  const counts = useStore((s) => s.voteCounts[duel.id] ?? { a: duel.a.votes, b: duel.b.votes });
  const aVotes = counts.a;
  const bVotes = counts.b;
  const total = aVotes + bVotes;
  const aPct = total > 0 ? Math.round((aVotes / total) * 100) : 50;
  const bPct = 100 - aPct;

  return (
    <article className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold leading-tight text-pretty">{duel.title}</h2>
        <span className="text-[10px] font-mono text-muted-foreground uppercase shrink-0">
          {duel.technique}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <DuelSide
          poster={duel.a.poster}
          handle={duel.a.handle}
          label="A"
          pct={aPct}
          selected={vote === "a"}
          voted={vote !== null}
          onClick={() => actions.vote(duel.id, "a")}
        />
        <DuelSide
          poster={duel.b.poster}
          handle={duel.b.handle}
          label="B"
          pct={bPct}
          selected={vote === "b"}
          voted={vote !== null}
          onClick={() => actions.vote(duel.id, "b")}
        />
      </div>

      {/* Vote bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden flex">
          <div className="h-full bg-accent transition-all duration-500" style={{ width: `${aPct}%` }} />
          <div className="h-full bg-primary transition-all duration-500" style={{ width: `${bPct}%` }} />
        </div>
      </div>
      <div className="flex justify-between text-[10px] font-mono uppercase tracking-wider">
        <span className="text-accent">{aPct}% A · {formatCount(aVotes)}</span>
        <span className="text-muted-foreground">{formatCount(total)} votes</span>
        <span className="text-primary">B {bPct}% · {formatCount(bVotes)}</span>
      </div>

      <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-secondary border border-border text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
        <MessageCircle className="size-3.5" />
        Add analysis
      </button>
    </article>
  );
}

function DuelSide({
  poster,
  handle,
  label,
  pct,
  selected,
  voted,
  onClick,
}: {
  poster: string;
  handle: string;
  label: "A" | "B";
  pct: number;
  selected: boolean;
  voted: boolean;
  onClick: () => void;
}) {
  const tint = label === "A" ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground";
  return (
    <button
      onClick={onClick}
      className={`relative aspect-[4/5] rounded-2xl overflow-hidden text-left transition-all active:scale-[0.98] ${
        selected ? "ring-2 ring-accent" : "ring-1 ring-border"
      } ${voted && !selected ? "opacity-60" : ""}`}
    >
      <img src={poster} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10" />
      <div className={`absolute top-2 left-2 px-2 py-1 text-[10px] font-bold uppercase italic tracking-tighter ${tint} rounded`}>
        Fighter {label}
      </div>
      {selected && (
        <div className="absolute top-2 right-2 size-7 rounded-full bg-accent flex items-center justify-center">
          <CheckCircle2 className="size-4 text-accent-foreground" />
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 p-3 space-y-0.5">
        <p className="text-xs font-semibold">{handle}</p>
        {voted && (
          <p className="text-[10px] font-mono text-accent">{pct}%</p>
        )}
      </div>
    </button>
  );
}