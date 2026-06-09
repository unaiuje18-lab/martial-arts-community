import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import {
  Upload,
  Swords,
  CalendarPlus,
  Target,
  Trophy,
  Check,
  X,
  Eye,
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  Award,
  Flame,
  Play,
  Volume2,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { MobileShell } from "@/components/MobileShell";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ARTS, LEVELS, type Art } from "@/lib/mock-data";
import { actions as storeActions } from "@/lib/store";
import { useUser } from "@/lib/auth";

export const Route = createFileRoute("/create")({
  head: () => ({
    meta: [
      { title: "STRIVE — Create" },
      { name: "description", content: "Upload a video, start a duel, log a session, or set a goal." },
    ],
  }),
  component: CreatePage,
});

type ActionKey = "video" | "duel" | "training" | "goal" | "achievement";

const ACTION_LIST: { key: ActionKey; icon: typeof Upload; title: string; desc: string }[] = [
  { key: "video", icon: Upload, title: "Upload Video", desc: "Share a technique or training clip" },
  { key: "duel", icon: Swords, title: "Start a Duel", desc: "Pit two executions against each other" },
  { key: "training", icon: CalendarPlus, title: "Log Training", desc: "Add a session to your private tracker" },
  { key: "goal", icon: Target, title: "Set a Goal", desc: "Track progress with weekly milestones" },
  { key: "achievement", icon: Trophy, title: "Post an Achievement", desc: "Belt promotion, competition, milestone" },
];

function CreatePage() {
  const [open, setOpen] = useState<ActionKey | null>(null);

  return (
    <MobileShell>
      <div className="space-y-6 animate-snap-in">
        <header className="space-y-1">
          <p className="text-[10px] font-mono text-accent uppercase tracking-widest">New</p>
          <h1 className="font-display text-4xl uppercase tracking-tight italic">Create</h1>
        </header>

        <div className="space-y-3">
          {ACTION_LIST.map(({ key, icon: Icon, title, desc }) => (
            <button
              key={key}
              onClick={() => setOpen(key)}
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

      <Sheet open={open !== null} onOpenChange={(v) => !v && setOpen(null)}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl border-t border-border bg-background max-h-[92dvh] overflow-y-auto"
        >
          {open === "video" && <UploadVideoForm onClose={() => setOpen(null)} />}
          {open === "duel" && <DuelForm onClose={() => setOpen(null)} />}
          {open === "training" && <TrainingForm onClose={() => setOpen(null)} />}
          {open === "goal" && <GoalForm onClose={() => setOpen(null)} />}
          {open === "achievement" && <AchievementForm onClose={() => setOpen(null)} />}
        </SheetContent>
      </Sheet>

      <FormStyles />
    </MobileShell>
  );
}

// ---------- shared bits ----------

function FormHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <SheetHeader className="text-left">
      <SheetTitle className="font-display text-2xl uppercase tracking-tight italic">{title}</SheetTitle>
      <SheetDescription>{desc}</SheetDescription>
    </SheetHeader>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">{label}</span>
      {children}
    </label>
  );
}

function FormActions({
  onCancel,
  onSubmit,
  submitLabel = "Publish",
  disabled,
}: {
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-3 pt-2">
      <button
        type="button"
        onClick={onCancel}
        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-secondary text-secondary-foreground font-bold uppercase tracking-wider text-sm active:scale-[0.98] transition-transform"
      >
        <X className="size-4" /> Cancel
      </button>
      <button
        type="button"
        onClick={onSubmit}
        disabled={disabled}
        className="flex-[2] flex items-center justify-center gap-2 py-3 rounded-2xl bg-accent text-accent-foreground font-bold uppercase tracking-wider text-sm active:scale-[0.98] transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Check className="size-4" /> {submitLabel}
      </button>
    </div>
  );
}

function ChipGrid<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const sel = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide border transition-colors ${
              sel ? "bg-accent text-accent-foreground border-accent" : "bg-card border-border text-muted-foreground"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

// ---------- Preview components ----------

function PreviewLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[10px] font-mono text-accent uppercase tracking-widest">
      <Eye className="size-3.5" />
      {children}
    </div>
  );
}

function MobilePreviewFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="bg-secondary/50 px-3 py-2 border-b border-border flex items-center justify-center gap-1.5">
        <div className="size-2 rounded-full bg-muted-foreground/30" />
        <div className="size-2 rounded-full bg-muted-foreground/30" />
        <div className="size-2 rounded-full bg-muted-foreground/30" />
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}

// ---------- 1. Upload Video ----------

function UploadVideoForm({ onClose }: { onClose: () => void }) {
  const user = useUser();
  const [videoUrl, setVideoUrl] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [art, setArt] = useState<Art | null>(null);
  const [level, setLevel] = useState<(typeof LEVELS)[number] | null>(null);
  const videoFileRef = useRef<HTMLInputElement>(null);
  const posterFileRef = useRef<HTMLInputElement>(null);

  const pickFile = (
    e: React.ChangeEvent<HTMLInputElement>,
    set: (url: string) => void,
  ) => {
    const f = e.target.files?.[0];
    if (!f) return;
    set(URL.createObjectURL(f));
  };

  const valid = !!videoUrl && !!caption.trim() && !!art && !!level;

  const submit = () => {
    if (!valid || !art || !level) return;
    storeActions.addPost({
      handle: user?.username ? `@${user.username}` : "@you",
      caption: caption.trim(),
      video: videoUrl,
      poster: posterUrl || "https://images.unsplash.com/photo-1517438476312-10d79c077509?w=800",
      art,
      level,
    });
    toast.success("Video published to your feed");
    onClose();
  };

  return (
    <div className="space-y-5 pb-6">
      <FormHeader title="Upload Video" desc="Share a clip with the community." />
      <Field label="Video file or URL">
        <div className="flex gap-2">
          <input
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://… or pick a file"
            className="profile-input flex-1"
          />
          <input
            ref={videoFileRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => pickFile(e, setVideoUrl)}
          />
          <button
            type="button"
            onClick={() => videoFileRef.current?.click()}
            className="px-3 rounded-xl bg-secondary border border-border text-xs font-bold uppercase tracking-wide"
          >
            File
          </button>
        </div>
      </Field>
      <Field label="Cover image (optional)">
        <div className="flex gap-2">
          <input
            value={posterUrl}
            onChange={(e) => setPosterUrl(e.target.value)}
            placeholder="https://… or pick a file"
            className="profile-input flex-1"
          />
          <input
            ref={posterFileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => pickFile(e, setPosterUrl)}
          />
          <button
            type="button"
            onClick={() => posterFileRef.current?.click()}
            className="px-3 rounded-xl bg-secondary border border-border text-xs font-bold uppercase tracking-wide"
          >
            File
          </button>
        </div>
      </Field>
      <Field label="Caption">
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value.slice(0, 220))}
          rows={3}
          placeholder="What technique are you drilling?"
          className="profile-input resize-none"
        />
      </Field>
      <div className="space-y-2">
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Discipline</span>
        <ChipGrid options={ARTS} value={art} onChange={setArt} />
      </div>
      <div className="space-y-2">
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Level</span>
        <ChipGrid options={LEVELS} value={level} onChange={setLevel} />
      </div>

      <div className="space-y-2">
        <PreviewLabel>Feed Preview</PreviewLabel>
        <MobilePreviewFrame>
          <VideoPreview
            handle={user?.username ? `@${user.username}` : "@you"}
            caption={caption || "Your caption will appear here…"}
            art={art ?? "BJJ"}
            level={level ?? "Beginner"}
            poster={posterUrl || undefined}
          />
        </MobilePreviewFrame>
      </div>

      <FormActions onCancel={onClose} onSubmit={submit} disabled={!valid} submitLabel="Publish" />
    </div>
  );
}

function VideoPreview({
  handle,
  caption,
  art,
  level,
  poster,
}: {
  handle: string;
  caption: string;
  art: Art;
  level: string;
  poster?: string;
}) {
  return (
    <div className="relative aspect-[9/16] bg-black overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${poster || "https://images.unsplash.com/photo-1517438476312-10d79c077509?w=800"})`,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/30" />
      
      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 pt-3 px-4 flex items-center justify-between">
        <h1 className="font-display text-lg uppercase tracking-tight italic text-white">
          STRIVE<span className="text-accent">.</span>
        </h1>
        <button className="size-7 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/80">
          <Volume2 className="size-3.5" />
        </button>
      </div>

      {/* Center play */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="size-12 rounded-full bg-black/50 backdrop-blur flex items-center justify-center">
          <Play className="size-5 text-white fill-white" />
        </div>
      </div>

      {/* Bottom overlay */}
      <div className="absolute inset-0 flex flex-col justify-end p-4">
        <div className="flex justify-between items-end gap-3">
          <div className="space-y-2 max-w-[75%]">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-full border-2 border-accent overflow-hidden bg-secondary" />
              <div>
                <p className="font-semibold text-xs tracking-tight text-white">{handle}</p>
                <p className="text-[9px] font-mono text-accent uppercase">You</p>
              </div>
              <button className="ml-1 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide bg-accent text-accent-foreground">
                Follow
              </button>
            </div>
            <p className="text-xs font-medium leading-snug text-white text-pretty line-clamp-3">
              {caption}
            </p>
            <div className="flex flex-wrap gap-1.5">
              <span className="px-1.5 py-0.5 bg-white/10 backdrop-blur-sm rounded text-[9px] font-bold uppercase tracking-wide text-white">
                {art}
              </span>
              <span className="px-1.5 py-0.5 bg-white/10 backdrop-blur-sm rounded text-[9px] font-bold uppercase tracking-wide text-white">
                {level}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3 items-center">
            <div className="flex flex-col items-center gap-0.5">
              <div className="size-9 rounded-full backdrop-blur-md border border-white/10 bg-white/5 flex items-center justify-center text-white">
                <Heart className="size-4" />
              </div>
              <span className="text-[9px] font-mono text-white">0</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <div className="size-9 rounded-full backdrop-blur-md border border-white/10 bg-white/5 flex items-center justify-center text-white">
                <MessageCircle className="size-4" />
              </div>
              <span className="text-[9px] font-mono text-white">0</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <div className="size-9 rounded-full backdrop-blur-md border border-white/10 bg-white/5 flex items-center justify-center text-white">
                <Bookmark className="size-4" />
              </div>
              <span className="text-[9px] font-mono text-white">Save</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <div className="size-9 rounded-full backdrop-blur-md border border-white/10 bg-white/5 flex items-center justify-center text-white">
                <Share2 className="size-4" />
              </div>
              <span className="text-[9px] font-mono text-white">Share</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- 2. Start a Duel ----------

function DuelForm({ onClose }: { onClose: () => void }) {
  const user = useUser();
  const myHandle = user?.username ? `@${user.username}` : "@you";
  const [title, setTitle] = useState("");
  const [technique, setTechnique] = useState("");
  const [aHandle, setAHandle] = useState(myHandle);
  const [aPoster, setAPoster] = useState("");
  const [bHandle, setBHandle] = useState("");
  const [bPoster, setBPoster] = useState("");

  const valid = !!title.trim() && !!technique.trim() && !!aHandle && !!bHandle;

  const submit = () => {
    if (!valid) return;
    const fallback = "https://images.unsplash.com/photo-1517438476312-10d79c077509?w=800";
    storeActions.addDuel({
      title: title.trim(),
      technique: technique.trim(),
      aHandle,
      bHandle,
      aPoster: aPoster || fallback,
      bPoster: bPoster || fallback,
    });
    toast.success("Duel started — voting is live");
    onClose();
  };

  return (
    <div className="space-y-5 pb-6">
      <FormHeader title="Start a Duel" desc="Pit two executions head-to-head." />
      <Field label="Title">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 80))}
          placeholder="Which armbar is cleaner?"
          className="profile-input"
        />
      </Field>
      <Field label="Technique">
        <input
          value={technique}
          onChange={(e) => setTechnique(e.target.value.slice(0, 60))}
          placeholder="Armbar from guard"
          className="profile-input"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <p className="text-[10px] font-mono text-accent uppercase tracking-widest">Fighter A</p>
          <input value={aHandle} onChange={(e) => setAHandle(e.target.value)} placeholder="@handle" className="profile-input" />
          <input value={aPoster} onChange={(e) => setAPoster(e.target.value)} placeholder="Image URL" className="profile-input" />
        </div>
        <div className="space-y-2">
          <p className="text-[10px] font-mono text-primary uppercase tracking-widest">Fighter B</p>
          <input value={bHandle} onChange={(e) => setBHandle(e.target.value)} placeholder="@handle" className="profile-input" />
          <input value={bPoster} onChange={(e) => setBPoster(e.target.value)} placeholder="Image URL" className="profile-input" />
        </div>
      </div>

      <div className="space-y-2">
        <PreviewLabel>Duel Preview</PreviewLabel>
        <MobilePreviewFrame>
          <DuelPreview
            title={title || "Duel title preview"}
            technique={technique || "Technique"}
            a={{ handle: aHandle || "@fighter_a", poster: aPoster }}
            b={{ handle: bHandle || "@fighter_b", poster: bPoster }}
          />
        </MobilePreviewFrame>
      </div>

      <FormActions onCancel={onClose} onSubmit={submit} disabled={!valid} submitLabel="Start duel" />
    </div>
  );
}

function DuelPreview({
  title,
  technique,
  a,
  b,
}: {
  title: string;
  technique: string;
  a: { handle: string; poster?: string };
  b: { handle: string; poster?: string };
}) {
  const fallback = "https://images.unsplash.com/photo-1517438476312-10d79c077509?w=800";
  return (
    <div className="p-4 space-y-3 bg-background">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold leading-tight text-pretty">{title}</h2>
        <span className="text-[9px] font-mono text-muted-foreground uppercase shrink-0">{technique}</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="relative aspect-[4/5] rounded-xl overflow-hidden ring-1 ring-border text-left">
          <img src={a.poster || fallback} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10" />
          <div className="absolute top-2 left-2 px-2 py-1 text-[9px] font-bold uppercase italic tracking-tighter bg-accent text-accent-foreground rounded">
            Fighter A
          </div>
          <div className="absolute inset-x-0 bottom-0 p-2.5 space-y-0.5">
            <p className="text-xs font-semibold text-white">{a.handle}</p>
          </div>
        </div>
        <div className="relative aspect-[4/5] rounded-xl overflow-hidden ring-1 ring-border text-left">
          <img src={b.poster || fallback} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10" />
          <div className="absolute top-2 left-2 px-2 py-1 text-[9px] font-bold uppercase italic tracking-tighter bg-primary text-primary-foreground rounded">
            Fighter B
          </div>
          <div className="absolute inset-x-0 bottom-0 p-2.5 space-y-0.5">
            <p className="text-xs font-semibold text-white">{b.handle}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden flex">
          <div className="h-full bg-accent" style={{ width: "50%" }} />
          <div className="h-full bg-primary" style={{ width: "50%" }} />
        </div>
      </div>
      <div className="flex justify-between text-[9px] font-mono uppercase tracking-wider">
        <span className="text-accent">50% A · 0</span>
        <span className="text-muted-foreground">0 votes</span>
        <span className="text-primary">B 50% · 0</span>
      </div>
    </div>
  );
}

// ---------- 3. Log Training ----------

function TrainingForm({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [art, setArt] = useState<Art | null>(null);
  const [duration, setDuration] = useState("60");
  const [effort, setEffort] = useState(7);
  const [notes, setNotes] = useState("");
  const [completed, setCompleted] = useState(true);

  const valid = !!date && !!art && Number(duration) > 0;

  const submit = () => {
    if (!valid || !art) return;
    storeActions.addSession({
      date: new Date(date).toISOString(),
      art,
      durationMin: Number(duration),
      effort,
      notes: notes.trim() || undefined,
      completed,
    });
    toast.success(completed ? "Session logged" : "Session planned", {
      action: { label: "Open tracker", onClick: () => navigate({ to: "/tracker" }) },
    });
    onClose();
  };

  return (
    <div className="space-y-5 pb-6">
      <FormHeader title="Log Training" desc="Add a session to your private tracker." />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date">
          <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} className="profile-input" />
        </Field>
        <Field label="Duration (min)">
          <input
            value={duration}
            onChange={(e) => setDuration(e.target.value.replace(/\D/g, "").slice(0, 3))}
            inputMode="numeric"
            className="profile-input"
          />
        </Field>
      </div>
      <div className="space-y-2">
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Discipline</span>
        <ChipGrid options={ARTS} value={art} onChange={setArt} />
      </div>
      <Field label={`Effort · ${effort}/10`}>
        <input
          type="range"
          min={1}
          max={10}
          value={effort}
          onChange={(e) => setEffort(Number(e.target.value))}
          className="w-full accent-[var(--accent)]"
        />
      </Field>
      <Field label="Notes (optional)">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value.slice(0, 280))}
          rows={3}
          placeholder="Drilled kimura entries…"
          className="profile-input resize-none"
        />
      </Field>
      <div className="flex gap-2">
        {(["Completed", "Planned"] as const).map((opt) => {
          const sel = (opt === "Completed") === completed;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => setCompleted(opt === "Completed")}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide border transition-colors ${
                sel ? "bg-accent text-accent-foreground border-accent" : "bg-card border-border text-muted-foreground"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        <PreviewLabel>Tracker Preview</PreviewLabel>
        <MobilePreviewFrame>
          <TrainingPreview
            date={date}
            art={art ?? "BJJ"}
            durationMin={Number(duration) || 60}
            effort={effort}
            notes={notes || undefined}
            completed={completed}
          />
        </MobilePreviewFrame>
      </div>

      <FormActions onCancel={onClose} onSubmit={submit} disabled={!valid} submitLabel="Save session" />
    </div>
  );
}

function TrainingPreview({
  date,
  art,
  durationMin,
  effort,
  notes,
  completed,
}: {
  date: string;
  art: Art;
  durationMin: number;
  effort: number;
  notes?: string;
  completed: boolean;
}) {
  const d = new Date(date);
  return (
    <div className="p-4 bg-background space-y-2">
      <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border border-l-2 border-l-accent">
        <div className="size-10 rounded-lg bg-accent/10 border border-accent/20 flex flex-col items-center justify-center leading-none shrink-0">
          <span className="text-[7px] font-mono text-accent uppercase">
            {d.toLocaleDateString(undefined, { weekday: "short" })}
          </span>
          <span className="text-xs font-bold text-accent">{d.getDate()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{art}</p>
          <p className="text-[9px] font-mono text-muted-foreground uppercase">
            {durationMin} min · RPE {effort}/10
            {notes ? ` · ${notes.slice(0, 30)}${notes.length > 30 ? "…" : ""}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {completed ? (
            <CheckCircle2 className="size-4 text-accent" />
          ) : (
            <div className="size-4 rounded-full border-2 border-muted-foreground" />
          )}
        </div>
      </div>
      <div className="flex justify-between text-[9px] font-mono text-muted-foreground uppercase px-1">
        <span>{completed ? "Completed session" : "Planned session"}</span>
        <span>{new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
      </div>
    </div>
  );
}

// ---------- 4. Set a Goal ----------

function GoalForm({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [progress, setProgress] = useState(0);

  const valid = !!title.trim() && !!target.trim();

  const submit = () => {
    if (!valid) return;
    storeActions.addGoal({ title: title.trim(), target: target.trim(), progress });
    toast.success("Goal added", {
      action: { label: "Open tracker", onClick: () => navigate({ to: "/tracker" }) },
    });
    onClose();
  };

  return (
    <div className="space-y-5 pb-6">
      <FormHeader title="Set a Goal" desc="Track weekly or long-term milestones." />
      <Field label="Goal">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 80))}
          placeholder="Train 4× per week"
          className="profile-input"
        />
      </Field>
      <Field label="Target">
        <input
          value={target}
          onChange={(e) => setTarget(e.target.value.slice(0, 60))}
          placeholder="4 sessions / week"
          className="profile-input"
        />
      </Field>
      <Field label={`Starting progress · ${progress}%`}>
        <input
          type="range"
          min={0}
          max={100}
          value={progress}
          onChange={(e) => setProgress(Number(e.target.value))}
          className="w-full accent-[var(--accent)]"
        />
      </Field>

      <div className="space-y-2">
        <PreviewLabel>Goal Preview</PreviewLabel>
        <MobilePreviewFrame>
          <GoalPreview title={title || "Your goal title"} target={target || "Target description"} progress={progress} />
        </MobilePreviewFrame>
      </div>

      <FormActions onCancel={onClose} onSubmit={submit} disabled={!valid} submitLabel="Save goal" />
    </div>
  );
}

function GoalPreview({ title, target, progress }: { title: string; target: string; progress: number }) {
  return (
    <div className="p-4 bg-background">
      <div className="bg-card border border-border rounded-xl p-4 space-y-2.5">
        <div className="flex justify-between items-baseline gap-2">
          <p className="text-sm font-semibold">{title}</p>
          <span className="text-[10px] font-mono text-accent">{progress}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
          <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-between items-center">
          <p className="text-[9px] font-mono text-muted-foreground uppercase">{target}</p>
          <Flame className="size-3.5 text-accent" />
        </div>
      </div>
    </div>
  );
}

// ---------- 5. Post Achievement ----------

function AchievementForm({ onClose }: { onClose: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [kind, setKind] = useState<"promotion" | "competition" | "milestone">("promotion");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [date, setDate] = useState(today);

  const valid = !!title.trim() && !!date;

  const submit = () => {
    if (!valid) return;
    storeActions.addAchievement({ kind, title: title.trim(), detail: detail.trim() || undefined, date });
    toast.success("Achievement posted");
    onClose();
  };

  const kinds: { id: typeof kind; label: string }[] = [
    { id: "promotion", label: "Promotion" },
    { id: "competition", label: "Competition" },
    { id: "milestone", label: "Milestone" },
  ];

  return (
    <div className="space-y-5 pb-6">
      <FormHeader title="Post Achievement" desc="Belt promotion, competition, or milestone." />
      <div className="flex gap-2">
        {kinds.map((k) => {
          const sel = kind === k.id;
          return (
            <button
              key={k.id}
              type="button"
              onClick={() => setKind(k.id)}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide border transition-colors ${
                sel ? "bg-accent text-accent-foreground border-accent" : "bg-card border-border text-muted-foreground"
              }`}
            >
              {k.label}
            </button>
          );
        })}
      </div>
      <Field label="Title">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 80))}
          placeholder={kind === "promotion" ? "Promoted to blue belt" : kind === "competition" ? "1st place — open mat" : "100 training days"}
          className="profile-input"
        />
      </Field>
      <Field label="Details (optional)">
        <textarea
          value={detail}
          onChange={(e) => setDetail(e.target.value.slice(0, 220))}
          rows={3}
          placeholder="Where, who promoted you, or notes…"
          className="profile-input resize-none"
        />
      </Field>
      <Field label="Date">
        <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} className="profile-input" />
      </Field>

      <div className="space-y-2">
        <PreviewLabel>Achievement Preview</PreviewLabel>
        <MobilePreviewFrame>
          <AchievementPreview kind={kind} title={title || "Achievement title"} detail={detail || undefined} date={date} />
        </MobilePreviewFrame>
      </div>

      <FormActions onCancel={onClose} onSubmit={submit} disabled={!valid} submitLabel="Post" />
    </div>
  );
}

function AchievementPreview({
  kind,
  title,
  detail,
  date,
}: {
  kind: "promotion" | "competition" | "milestone";
  title: string;
  detail?: string;
  date: string;
}) {
  const icons = {
    promotion: <TrendingUp className="size-5 text-accent" />,
    competition: <Trophy className="size-5 text-accent" />,
    milestone: <Award className="size-5 text-accent" />,
  };
  const labels = {
    promotion: "Belt Promotion",
    competition: "Competition Result",
    milestone: "Training Milestone",
  };
  const d = new Date(date);
  return (
    <div className="p-4 bg-background">
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
            {icons[kind]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-mono text-accent uppercase tracking-wider">{labels[kind]}</p>
            <p className="text-sm font-semibold truncate">{title}</p>
          </div>
        </div>
        {detail && <p className="text-xs text-muted-foreground leading-snug">{detail}</p>}
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-mono text-muted-foreground uppercase">
            {d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          </span>
          <div className="flex items-center gap-1">
            <Flame className="size-3 text-accent" />
            <span className="text-[9px] font-mono text-accent">Achievement</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormStyles() {
  return (
    <style>{`
      .profile-input {
        width: 100%;
        background: color-mix(in oklch, var(--secondary) 60%, transparent);
        border: 1px solid var(--border);
        border-radius: 0.75rem;
        padding: 0.75rem 0.9rem;
        font-size: 0.875rem;
        outline: none;
        transition: border-color 0.2s;
        color: var(--foreground);
      }
      .profile-input:focus {
        border-color: color-mix(in oklch, var(--accent) 60%, transparent);
        box-shadow: 0 0 0 3px color-mix(in oklch, var(--accent) 20%, transparent);
      }
      .profile-input::placeholder { color: var(--muted-foreground); }
    `}</style>
  );
}
