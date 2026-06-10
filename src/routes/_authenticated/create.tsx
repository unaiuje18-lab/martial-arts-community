import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
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
  Film,
  ImagePlus,
  Trash2,
  Loader2,
  Crop,
  Scissors,
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
import { uploadMedia, type UploadResult } from "@/lib/media-upload";
import {
  processVideo,
  ALLOWED_VIDEO_MIME,
  VideoValidationError,
  MAX_VIDEO_MB,
  COMPRESS_THRESHOLD_MB,
  type VideoMeta,
} from "@/lib/video-process";

export const Route = createFileRoute("/_authenticated/create")({
  head: () => ({
    meta: [
      { title: "STRIVE — Create" },
      { name: "description", content: "Upload a video, start a duel, log a session, or set a goal." },
    ],
  }),
  component: CreatePage,
});

type ActionKey = "video" | "duel" | "training" | "goal" | "achievement";

// ---- Upload limits ----
const MAX_IMAGE_MB = 8;

function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(new Error("Could not read file"));
    r.readAsDataURL(file);
  });
}

/** Capture a 9:16 cover from a loaded <video> at the given yOffset (0..1). */
function captureCover(video: HTMLVideoElement, yOffset: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const targetW = 720;
      const targetH = 1280;
      const c = document.createElement("canvas");
      c.width = targetW;
      c.height = targetH;
      const ctx = c.getContext("2d");
      if (!ctx) throw new Error("no-ctx");
      const vw = video.videoWidth || targetW;
      const vh = video.videoHeight || targetH;
      const scale = Math.max(targetW / vw, targetH / vh);
      const drawW = vw * scale;
      const drawH = vh * scale;
      const dx = (targetW - drawW) / 2;
      const extraY = drawH - targetH;
      const dy = -(yOffset * extraY);
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, targetW, targetH);
      ctx.drawImage(video, dx, dy, drawW, drawH);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/jpeg", 0.85);
    } catch (e) {
      reject(e);
    }
  });
}

function UploadProgressBar({ progress, label }: { progress: number; label: string }) {
  const pct = Math.round(progress * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest">
        <span className="text-muted-foreground flex items-center gap-1.5">
          <Loader2 className="size-3 animate-spin" /> {label}
        </span>
        <span className="text-accent">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

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

  // Local file + backend upload state
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoLocalUrl, setVideoLocalUrl] = useState("");
  const [videoUpload, setVideoUpload] = useState<UploadResult | null>(null);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoStage, setVideoStage] = useState<
    "idle" | "validate" | "probe" | "compress" | "uploading" | "finalising" | "done"
  >("idle");
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoMeta, setVideoMeta] = useState<VideoMeta | null>(null);
  const [videoCompressed, setVideoCompressed] = useState(false);

  // Poster scrubber & crop
  const [duration, setDuration] = useState(0);
  const [posterSecond, setPosterSecond] = useState(0.5);
  const [posterOffsetY, setPosterOffsetY] = useState(0.5);
  const [posterPreview, setPosterPreview] = useState("");
  const [posterUpload, setPosterUpload] = useState<UploadResult | null>(null);
  const [posterProgress, setPosterProgress] = useState(0);
  const [posterUploading, setPosterUploading] = useState(false);

  const [caption, setCaption] = useState("");
  const [art, setArt] = useState<Art | null>(null);
  const [level, setLevel] = useState<(typeof LEVELS)[number] | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const videoFileRef = useRef<HTMLInputElement>(null);
  const videoElRef = useRef<HTMLVideoElement>(null);

  useEffect(() => () => {
    if (videoLocalUrl) URL.revokeObjectURL(videoLocalUrl);
  }, [videoLocalUrl]);

  const handleVideoFile = async (f: File | null | undefined) => {
    if (!f) return;
    setVideoError(null);
    setVideoUpload(null);
    setPosterUpload(null);
    setPosterPreview("");
    setDuration(0);
    setPosterSecond(0.5);
    setVideoCompressed(false);
    setVideoMeta(null);
    setVideoUploading(true);
    setVideoProgress(0);

    let localUrl = "";
    try {
      // 1. Validate + (optionally) compress.
      setVideoStage("validate");
      const processed = await processVideo(f, {
        onStage: (s) => setVideoStage(s),
      });
      setVideoMeta(processed.meta);
      setVideoCompressed(processed.compressed);

      const blob = processed.file;
      localUrl = URL.createObjectURL(blob);
      if (videoLocalUrl) URL.revokeObjectURL(videoLocalUrl);
      // Keep a File-shaped object so the preview/UI keeps the original name.
      setVideoFile(
        new File([blob], f.name.replace(/\.[^.]+$/, "") + (processed.compressed ? ".webm" : ""), {
          type: processed.contentType,
        }),
      );
      setVideoLocalUrl(localUrl);

      // 2. Upload to storage.
      setVideoStage("uploading");
      const result = await uploadMedia(blob, {
        folder: "videos",
        filename: f.name.replace(/\.[^.]+$/, ""),
        contentType: processed.contentType,
        onProgress: (p) => setVideoProgress(p),
      });
      setVideoStage("finalising");
      setVideoUpload(result);
      setVideoStage("done");
      toast.success(
        processed.compressed
          ? `Video uploaded (compressed ${(processed.originalBytes / 1024 / 1024).toFixed(1)} → ${(processed.bytes / 1024 / 1024).toFixed(1)} MB)`
          : "Video uploaded",
      );
    } catch (e) {
      const err = e as Error;
      const msg =
        e instanceof VideoValidationError
          ? err.message
          : err.message || "Could not upload video — please try again.";
      setVideoError(msg);
      toast.error(msg);
      setVideoFile(null);
      setVideoUpload(null);
      if (localUrl) URL.revokeObjectURL(localUrl);
      setVideoLocalUrl("");
      setVideoStage("idle");
    } finally {
      setVideoUploading(false);
    }
  };

  const clearVideo = () => {
    if (videoLocalUrl) URL.revokeObjectURL(videoLocalUrl);
    setVideoFile(null);
    setVideoLocalUrl("");
    setVideoUpload(null);
    setVideoProgress(0);
    setPosterPreview("");
    setPosterUpload(null);
    setPosterProgress(0);
    setDuration(0);
    setVideoError(null);
    setVideoStage("idle");
    setVideoCompressed(false);
    setVideoMeta(null);
    if (videoFileRef.current) videoFileRef.current.value = "";
  };

  const regeneratePreview = async () => {
    const v = videoElRef.current;
    if (!v || !videoLocalUrl) return;
    try {
      const want = Math.min(Math.max(0, posterSecond), Math.max(0, (v.duration || duration) - 0.05));
      if (Math.abs(v.currentTime - want) > 0.05) {
        await new Promise<void>((res) => {
          const onSeek = () => { v.removeEventListener("seeked", onSeek); res(); };
          v.addEventListener("seeked", onSeek);
          v.currentTime = want;
        });
      }
      const blob = await captureCover(v, posterOffsetY);
      setPosterPreview(await fileToDataUrl(blob));
      setPosterUpload(null);
      setPosterProgress(0);
    } catch {/* ignore */}
  };

  useEffect(() => {
    if (!videoLocalUrl || !duration) return;
    const t = setTimeout(() => void regeneratePreview(), 120);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posterSecond, posterOffsetY, duration, videoLocalUrl]);

  const uploadPoster = async () => {
    const v = videoElRef.current;
    if (!v) return;
    setPosterUploading(true);
    setPosterProgress(0);
    try {
      const blob = await captureCover(v, posterOffsetY);
      if (blob.size / (1024 * 1024) > MAX_IMAGE_MB) throw new Error("Cover too large");
      const result = await uploadMedia(blob, {
        folder: "posters",
        filename: "cover",
        contentType: "image/jpeg",
        onProgress: (p) => setPosterProgress(p),
      });
      setPosterUpload(result);
      toast.success("Cover saved");
    } catch (e) {
      toast.error((e as Error).message || "Could not save cover");
    } finally {
      setPosterUploading(false);
    }
  };

  const missing: string[] = [];
  if (!videoUpload) missing.push("video uploaded");
  if (!posterUpload) missing.push("cover saved");
  if (!caption.trim()) missing.push("caption");
  if (!art) missing.push("discipline");
  if (!level) missing.push("level");
  const busy = videoUploading || posterUploading || publishing;
  const canPublish = missing.length === 0 && !busy;

  const submit = async () => {
    if (!canPublish || !art || !level || !videoUpload || !posterUpload) {
      toast.error(`Missing: ${missing.join(", ")}`);
      return;
    }
    setPublishing(true);
    try {
      await storeActions.addPost({
        handle: user?.username ? `@${user.username}` : "@you",
        caption: caption.trim(),
        video: videoUpload.url,
        poster: posterUpload.url,
        videoPath: videoUpload.path,
        posterPath: posterUpload.path,
        art,
        level,
      });
      toast.success("Video published to your feed");
      onClose();
    } catch (e) {
      toast.error((e as Error).message || "Could not publish");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-5 pb-6">
      <FormHeader title="Upload Video" desc="Share a clip with the community." />
      <div className="space-y-1.5">
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Video</span>
        <input
          ref={videoFileRef}
          type="file"
          accept={ALLOWED_VIDEO_MIME.join(",")}
          className="hidden"
          onChange={(e) => handleVideoFile(e.target.files?.[0])}
        />
        {!videoLocalUrl ? (
          <button
            type="button"
            onClick={() => videoFileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleVideoFile(e.dataTransfer.files?.[0]); }}
            className={`w-full flex flex-col items-center justify-center gap-2 py-10 rounded-2xl border-2 border-dashed transition-colors ${dragOver ? "border-accent bg-accent/5" : "border-border bg-card/50"}`}
          >
            <Film className="size-7 text-accent" />
            <p className="text-sm font-semibold">Tap to choose a video</p>
            <p className="text-[11px] text-muted-foreground">
              or drag & drop · MP4 / MOV / WebM · up to {MAX_VIDEO_MB}MB
            </p>
            <p className="text-[10px] text-muted-foreground/70">
              Files over {COMPRESS_THRESHOLD_MB}MB are compressed automatically when possible.
            </p>
          </button>
        ) : (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <video
              ref={videoElRef}
              src={videoLocalUrl}
              controls
              playsInline
              preload="metadata"
              onLoadedMetadata={(e) => {
                const v = e.currentTarget;
                setDuration(v.duration || 0);
                setPosterSecond(Math.min(0.5, (v.duration || 1) / 4));
              }}
              className="w-full aspect-video bg-black object-contain"
            />
            {videoUploading && (
              <div className="px-3 pt-3">
                <UploadProgressBar
                  progress={videoStage === "uploading" ? videoProgress : videoStage === "finalising" || videoStage === "done" ? 1 : 0.05}
                  label={stageLabel(videoStage)}
                />
              </div>
            )}
            <div className="flex items-center justify-between gap-2 p-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">{videoFile?.name || "Selected video"}</p>
                <p className="text-[10px] font-mono uppercase">
                  {videoFile ? `${(videoFile.size / 1024 / 1024).toFixed(1)}MB` : ""}
                  {videoMeta && videoMeta.width > 0 ? (
                    <span className="text-muted-foreground"> · {videoMeta.width}×{videoMeta.height} · {videoMeta.duration.toFixed(0)}s</span>
                  ) : null}
                  {videoCompressed && <span className="text-accent"> · compressed</span>}
                  {videoUpload ? (
                    <span className="text-accent"> · saved to cloud</span>
                  ) : videoUploading ? (
                    <span className="text-muted-foreground"> · uploading…</span>
                  ) : (
                    <span className="text-destructive"> · not uploaded</span>
                  )}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  disabled={videoUploading}
                  onClick={() => videoFileRef.current?.click()}
                  className="px-2.5 py-1.5 rounded-lg bg-secondary border border-border text-[10px] font-bold uppercase tracking-wide disabled:opacity-40"
                >
                  Replace
                </button>
                <button
                  type="button"
                  disabled={videoUploading}
                  onClick={clearVideo}
                  className="px-2.5 py-1.5 rounded-lg bg-secondary border border-border text-[10px] font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1 disabled:opacity-40"
                >
                  <Trash2 className="size-3" /> Remove
                </button>
              </div>
            </div>
          </div>
        )}
        {videoError && (
          <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive flex items-start gap-2">
            <X className="size-3.5 mt-0.5 shrink-0" />
            <span>{videoError}</span>
          </div>
        )}
      </div>

      {videoLocalUrl && (
        <div className="space-y-3 p-3 rounded-2xl bg-card border border-border">
          <div className="flex items-center gap-2">
            <Scissors className="size-3.5 text-accent" />
            <span className="text-[10px] font-mono text-accent uppercase tracking-widest">
              Pick cover frame
            </span>
          </div>
          <div className="grid grid-cols-[88px_1fr] gap-3 items-start">
            <div className="aspect-[9/16] rounded-lg overflow-hidden bg-secondary border border-border flex items-center justify-center">
              {posterPreview ? (
                <img src={posterPreview} alt="cover" className="w-full h-full object-cover" />
              ) : (
                <ImagePlus className="size-4 text-muted-foreground" />
              )}
            </div>
            <div className="space-y-2 min-w-0">
              <label className="block space-y-1">
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest flex justify-between">
                  <span>Second</span>
                  <span className="text-accent">{posterSecond.toFixed(2)}s / {duration.toFixed(1)}s</span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={Math.max(0.1, duration)}
                  step={0.05}
                  value={Math.min(posterSecond, duration || 0.1)}
                  onChange={(e) => setPosterSecond(Number(e.target.value))}
                  disabled={!duration}
                  className="w-full accent-[var(--accent)]"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest flex justify-between">
                  <span>Vertical crop</span>
                  <Crop className="size-3" />
                </span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={posterOffsetY}
                  onChange={(e) => setPosterOffsetY(Number(e.target.value))}
                  className="w-full accent-[var(--accent)]"
                />
              </label>
            </div>
          </div>
          {posterUploading && <UploadProgressBar progress={posterProgress} label="Uploading cover" />}
          <button
            type="button"
            onClick={uploadPoster}
            disabled={!posterPreview || posterUploading || videoUploading}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-secondary border border-border text-xs font-bold uppercase tracking-wide disabled:opacity-40"
          >
            {posterUpload ? (
              <><CheckCircle2 className="size-4 text-accent" /> Cover saved · update</>
            ) : posterUploading ? (
              <><Loader2 className="size-4 animate-spin" /> Saving…</>
            ) : (
              <><Check className="size-4" /> Use this cover</>
            )}
          </button>
        </div>
      )}

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
            poster={posterPreview || undefined}
          />
        </MobilePreviewFrame>
      </div>

      {missing.length > 0 && (
        <p className="text-[11px] text-muted-foreground">
          Missing: <span className="text-foreground">{missing.join(", ")}</span>
        </p>
      )}
      <FormActions
        onCancel={onClose}
        onSubmit={submit}
        disabled={!canPublish}
        submitLabel={publishing ? "Publishing…" : "Publish"}
      />
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
  const [bHandle, setBHandle] = useState("");
  const [a, setA] = useState<{ local: string; upload: UploadResult | null; progress: number; uploading: boolean }>({ local: "", upload: null, progress: 0, uploading: false });
  const [b, setB] = useState<{ local: string; upload: UploadResult | null; progress: number; uploading: boolean }>({ local: "", upload: null, progress: 0, uploading: false });
  const [publishing, setPublishing] = useState(false);
  const aRef = useRef<HTMLInputElement>(null);
  const bRef = useRef<HTMLInputElement>(null);

  const pickImage = async (
    e: React.ChangeEvent<HTMLInputElement>,
    side: "a" | "b",
  ) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) { toast.error("That file is not an image"); return; }
    const mb = f.size / (1024 * 1024);
    if (mb > MAX_IMAGE_MB) { toast.error(`Image too large (${mb.toFixed(1)}MB). Max ${MAX_IMAGE_MB}MB.`); return; }

    const local = await fileToDataUrl(f);
    const setSide = side === "a" ? setA : setB;
    setSide({ local, upload: null, progress: 0, uploading: true });
    try {
      const result = await uploadMedia(f, {
        folder: "fighters",
        filename: f.name.replace(/\.[^.]+$/, ""),
        contentType: f.type,
        onProgress: (p) => setSide((s) => ({ ...s, progress: p })),
      });
      setSide((s) => ({ ...s, upload: result, uploading: false, progress: 1 }));
      toast.success(`Fighter ${side.toUpperCase()} image uploaded`);
    } catch (err) {
      toast.error((err as Error).message || "Could not upload image");
      setSide({ local: "", upload: null, progress: 0, uploading: false });
    }
  };

  const clearSide = (side: "a" | "b") => {
    const setSide = side === "a" ? setA : setB;
    setSide({ local: "", upload: null, progress: 0, uploading: false });
    const ref = side === "a" ? aRef : bRef;
    if (ref.current) ref.current.value = "";
  };

  const missing: string[] = [];
  if (!title.trim()) missing.push("title");
  if (!technique.trim()) missing.push("technique");
  if (!aHandle.trim()) missing.push("fighter A handle");
  if (!bHandle.trim()) missing.push("fighter B handle");
  if (!a.upload) missing.push("fighter A image");
  if (!b.upload) missing.push("fighter B image");
  const busy = a.uploading || b.uploading || publishing;
  const canPublish = missing.length === 0 && !busy;

  const submit = async () => {
    if (!canPublish || !a.upload || !b.upload) {
      toast.error(`Missing: ${missing.join(", ")}`);
      return;
    }
    setPublishing(true);
    try {
      await storeActions.addDuel({
        title: title.trim(),
        technique: technique.trim(),
        aHandle: aHandle.trim(),
        bHandle: bHandle.trim(),
        aPoster: a.upload.url,
        bPoster: b.upload.url,
        aPosterPath: a.upload.path,
        bPosterPath: b.upload.path,
      });
      toast.success("Duel started — voting is live");
      onClose();
    } catch (e) {
      toast.error((e as Error).message || "Could not start duel");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-5 pb-6">
      <FormHeader title="Start a Duel" desc="Pit two executions head-to-head." />
      <Field label="Title">
        <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 80))} placeholder="Which armbar is cleaner?" className="profile-input" />
      </Field>
      <Field label="Technique">
        <input value={technique} onChange={(e) => setTechnique(e.target.value.slice(0, 60))} placeholder="Armbar from guard" className="profile-input" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <p className="text-[10px] font-mono text-accent uppercase tracking-widest">Fighter A</p>
          <input value={aHandle} onChange={(e) => setAHandle(e.target.value)} placeholder="@handle" className="profile-input" />
          <FighterImagePicker
            value={a.local}
            uploaded={!!a.upload}
            uploading={a.uploading}
            progress={a.progress}
            onPick={() => aRef.current?.click()}
            onClear={() => clearSide("a")}
          />
          <input ref={aRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickImage(e, "a")} />
        </div>
        <div className="space-y-2">
          <p className="text-[10px] font-mono text-primary uppercase tracking-widest">Fighter B</p>
          <input value={bHandle} onChange={(e) => setBHandle(e.target.value)} placeholder="@handle" className="profile-input" />
          <FighterImagePicker
            value={b.local}
            uploaded={!!b.upload}
            uploading={b.uploading}
            progress={b.progress}
            onPick={() => bRef.current?.click()}
            onClear={() => clearSide("b")}
          />
          <input ref={bRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickImage(e, "b")} />
        </div>
      </div>

      <div className="space-y-2">
        <PreviewLabel>Duel Preview</PreviewLabel>
        <MobilePreviewFrame>
          <DuelPreview
            title={title || "Duel title preview"}
            technique={technique || "Technique"}
            a={{ handle: aHandle || "@fighter_a", poster: a.local }}
            b={{ handle: bHandle || "@fighter_b", poster: b.local }}
          />
        </MobilePreviewFrame>
      </div>

      {missing.length > 0 && (
        <p className="text-[11px] text-muted-foreground">
          Missing: <span className="text-foreground">{missing.join(", ")}</span>
        </p>
      )}
      <FormActions
        onCancel={onClose}
        onSubmit={submit}
        disabled={!canPublish}
        submitLabel={publishing ? "Starting…" : "Start duel"}
      />
    </div>
  );
}

function FighterImagePicker({
  value,
  onPick,
  onClear,
  uploaded,
  uploading,
  progress,
}: {
  value: string;
  onPick: () => void;
  onClear: () => void;
  uploaded: boolean;
  uploading: boolean;
  progress: number;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 p-2 rounded-xl bg-card border border-border">
        <div className="size-12 rounded-lg overflow-hidden bg-secondary shrink-0 flex items-center justify-center relative">
          {value ? (
            <img src={value} alt="" className="w-full h-full object-cover" />
          ) : (
            <ImagePlus className="size-4 text-muted-foreground" />
          )}
          {uploading && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <Loader2 className="size-4 animate-spin text-white" />
            </div>
          )}
          {uploaded && !uploading && (
            <div className="absolute bottom-0 right-0 size-4 rounded-full bg-accent flex items-center justify-center">
              <Check className="size-2.5 text-accent-foreground" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <button
            type="button"
            onClick={onPick}
            disabled={uploading}
            className="px-2 py-1 rounded-md bg-secondary border border-border text-[10px] font-bold uppercase tracking-wide disabled:opacity-40"
          >
            {value ? "Replace" : "Pick image"}
          </button>
          {value && !uploading && (
            <button
              type="button"
              onClick={onClear}
              className="text-[9px] font-mono text-muted-foreground uppercase tracking-wide text-left"
            >
              Remove
            </button>
          )}
        </div>
      </div>
      {uploading && <UploadProgressBar progress={progress} label="Uploading" />}
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
