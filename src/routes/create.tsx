import { createFileRoute } from "@tanstack/react-router";
import { Upload, Swords, CalendarPlus, Target, Trophy } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";

export const Route = createFileRoute("/create")({
  head: () => ({
    meta: [
      { title: "STRIVE — Create" },
      { name: "description", content: "Upload a video, start a duel, log a session, or set a goal." },
    ],
  }),
  component: CreatePage,
});

const actions = [
  { icon: Upload, title: "Upload Video", desc: "Share a technique or training clip" },
  { icon: Swords, title: "Start a Duel", desc: "Pit two executions against each other" },
  { icon: CalendarPlus, title: "Log Training", desc: "Add a session to your private tracker" },
  { icon: Target, title: "Set a Goal", desc: "Track progress with weekly milestones" },
  { icon: Trophy, title: "Post an Achievement", desc: "Belt promotion, competition, milestone" },
];

function CreatePage() {
  return (
    <MobileShell>
      <div className="space-y-6 animate-snap-in">
        <header className="space-y-1">
          <p className="text-[10px] font-mono text-accent uppercase tracking-widest">New</p>
          <h1 className="font-display text-4xl uppercase tracking-tight italic">Create</h1>
        </header>

        <div className="space-y-3">
          {actions.map(({ icon: Icon, title, desc }) => (
            <button
              key={title}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-card border border-border hover:border-accent/40 transition-colors text-left active:scale-[0.99]"
            >
              <div className="size-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                <Icon className="size-5 text-accent" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{title}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </MobileShell>
  );
}