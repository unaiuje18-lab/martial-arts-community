import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Heart, MessageCircle, Bookmark, Share2, Volume2, VolumeX, Play, X, Send, RefreshCw, AlertTriangle, Inbox, WifiOff, Wifi } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MobileShell } from "@/components/MobileShell";
import { formatCount, type FeedPost } from "@/lib/mock-data";
import { actions, useStore, fetchBackendFeed, applyBackendFeed, type BackendFeed } from "@/lib/store";
import { Skeleton } from "@/components/ui/skeleton";
import { reportLovableError } from "@/lib/lovable-error-reporting";
import { measureQuery } from "@/lib/metrics";
import { useOnlineStatus } from "@/hooks/use-online-status";

const FEED_CACHE_KEY = "strive:feed-cache:v1";

function readFeedCache(): BackendFeed | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(FEED_CACHE_KEY);
    if (!raw) return undefined;
    return JSON.parse(raw) as BackendFeed;
  } catch {
    return undefined;
  }
}

function writeFeedCache(data: BackendFeed) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FEED_CACHE_KEY, JSON.stringify(data));
  } catch {
    /* quota — ignore */
  }
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "STRIVE — For You" },
      { name: "description", content: "Vertical video feed of martial arts training and technique breakdowns." },
    ],
  }),
  component: FeedPage,
});

function FeedPage() {
  const userPosts = useStore((s) => s.userPosts);
  const queryClient = useQueryClient();
  const { online, justReconnected } = useOnlineStatus();

  const hydration = useQuery({
    queryKey: ["feed", "hydration"],
    queryFn: async () => {
      const data = await measureQuery("feed.hydration", () => fetchBackendFeed());
      applyBackendFeed(data);
      writeFeedCache(data);
      return data;
    },
    // Critical query: aggressive retry with exponential backoff via QueryClient
    // defaults. Keep cached for a minute so back-nav is instant.
    staleTime: 60_000,
    // Offline-first: seed from persistent cache so the feed renders instantly.
    initialData: () => {
      const cached = readFeedCache();
      if (cached) applyBackendFeed(cached);
      return cached;
    },
    // Don't keep hammering the network when offline.
    enabled: online,
    networkMode: "offlineFirst",
  });

  useEffect(() => {
    if (hydration.error) {
      reportLovableError(hydration.error, { source: "feed_hydration" }, { handled: true });
    }
  }, [hydration.error]);

  // Auto-refetch when the connection comes back.
  useEffect(() => {
    if (justReconnected) {
      queryClient.invalidateQueries({ queryKey: ["feed", "hydration"] });
    }
  }, [justReconnected, queryClient]);

  const feed = userPosts;
  const [muted, setMuted] = useState(true);
  const [activeId, setActiveId] = useState<string>(feed[0]?.id ?? "");
  const [openComments, setOpenComments] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const best = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (best) {
          const id = (best.target as HTMLElement).dataset.id;
          if (id) setActiveId(id);
        }
      },
      { root, threshold: [0.6] },
    );
    root.querySelectorAll<HTMLElement>("[data-feed-card]").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [userPosts.length]);

  // First-paint loading: only when we have no fallback content to show.
  const isInitialLoading = hydration.isPending && userPosts.length === 0;
  const hasError = !!hydration.error;
  const isEmpty = !hydration.isPending && feed.length === 0;

  if (isInitialLoading) {
    return (
      <MobileShell fullBleed>
        <FeedSkeleton />
      </MobileShell>
    );
  }

  if (isEmpty) {
    return (
      <MobileShell fullBleed>
        <ConnectionBanner online={online} justReconnected={justReconnected} />
        <FeedEmpty onRetry={() => hydration.refetch()} />
      </MobileShell>
    );
  }

  return (
    <MobileShell fullBleed>
      <ConnectionBanner online={online} justReconnected={justReconnected} />
      {hasError && (
        <FeedErrorBanner
          error={hydration.error as Error}
          onRetry={() => hydration.refetch()}
          isRetrying={hydration.isFetching}
        />
      )}
      <div
        ref={containerRef}
        className="h-[100dvh] overflow-y-scroll snap-y snap-mandatory no-scrollbar"
        aria-label="Video feed"
      >
        {feed.map((post, i) => (
          <FeedCard
            key={post.id}
            post={post}
            priority={i === 0}
            active={activeId === post.id}
            muted={muted}
            onToggleMute={() => setMuted((v) => !v)}
            onOpenComments={() => setOpenComments(post.id)}
          />
        ))}
      </div>
      {openComments && (
        <CommentsSheet postId={openComments} onClose={() => setOpenComments(null)} />
      )}
    </MobileShell>
  );
}

function ConnectionBanner({ online, justReconnected }: { online: boolean; justReconnected: boolean }) {
  if (online && !justReconnected) return null;
  const isOffline = !online;
  return (
    <div
      role="status"
      aria-live="polite"
      className={`absolute top-[max(0.75rem,env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide backdrop-blur-md shadow-lg ${
        isOffline
          ? "bg-zinc-900/90 text-white border border-white/15"
          : "bg-emerald-600/90 text-white"
      }`}
    >
      {isOffline ? <WifiOff className="size-3.5" /> : <Wifi className="size-3.5" />}
      {isOffline ? "Offline · cached feed" : "Back online"}
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="h-[100dvh] w-full bg-background relative overflow-hidden">
      <Skeleton className="absolute inset-0 rounded-none bg-muted" />
      <div className="absolute top-0 inset-x-0 pt-[max(1rem,env(safe-area-inset-top))] px-5 flex items-center justify-between">
        <Skeleton className="h-6 w-24 bg-muted" />
        <Skeleton className="size-8 rounded-full bg-muted" />
      </div>
      <div className="absolute inset-x-0 bottom-0 p-5 pb-28 space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="size-10 rounded-full bg-muted" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-28 bg-muted" />
            <Skeleton className="h-2 w-16 bg-muted" />
          </div>
        </div>
        <Skeleton className="h-4 w-3/4 bg-muted" />
        <Skeleton className="h-4 w-1/2 bg-muted" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-14 bg-muted" />
          <Skeleton className="h-5 w-14 bg-muted" />
        </div>
      </div>
    </div>
  );
}

function FeedEmpty({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="h-[100dvh] flex flex-col items-center justify-center px-8 text-center bg-background text-foreground">
      <Inbox className="size-12 text-muted-foreground mb-4" />
      <h2 className="font-display text-2xl uppercase italic tracking-tight">Feed empty</h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-xs">
        No posts yet. Be the first to upload technique.
      </p>
      <button
        onClick={onRetry}
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent text-accent-foreground px-4 py-2 text-xs font-bold uppercase tracking-wide active:scale-95 transition-transform"
      >
        <RefreshCw className="size-4" /> Reload
      </button>
    </div>
  );
}

function FeedErrorBanner({
  error,
  onRetry,
  isRetrying,
}: {
  error: Error;
  onRetry: () => void;
  isRetrying: boolean;
}) {
  const [incidentId, setIncidentId] = useState<string | null>(null);
  useEffect(() => {
    const id = reportLovableError(error, { boundary: "feed_banner" }, { handled: true });
    setIncidentId(id);
  }, [error]);
  return (
    <div
      role="alert"
      className="absolute top-[max(0.75rem,env(safe-area-inset-top))] left-3 right-3 z-30 rounded-xl bg-destructive/90 backdrop-blur-md text-destructive-foreground p-3 flex items-start gap-3 shadow-lg"
    >
      <AlertTriangle className="size-4 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold">Couldn't refresh the feed</p>
        <p className="text-[11px] opacity-90 mt-0.5">
          Showing cached content. {incidentId && <span className="font-mono">ID {incidentId}</span>}
        </p>
      </div>
      <button
        onClick={onRetry}
        disabled={isRetrying}
        className="text-[10px] font-bold uppercase tracking-wide bg-white/15 hover:bg-white/25 px-2.5 py-1 rounded-full disabled:opacity-60 flex items-center gap-1"
      >
        <RefreshCw className={`size-3 ${isRetrying ? "animate-spin" : ""}`} />
        Retry
      </button>
    </div>
  );
}

function FeedCard({
  post,
  priority,
  active,
  muted,
  onToggleMute,
  onOpenComments,
}: {
  post: FeedPost;
  priority: boolean;
  active: boolean;
  muted: boolean;
  onToggleMute: () => void;
  onOpenComments: () => void;
}) {
  const liked = useStore((s) => !!s.likes[post.id]);
  const saved = useStore((s) => !!s.saves[post.id]);
  const following = useStore((s) => !!s.follows[post.handle]);
  const likeCount = useStore((s) => s.likeCounts[post.id] ?? post.likes);
  const commentCount = useStore((s) => s.commentCounts[post.id] ?? post.comments);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (active && !paused) v.play().catch(() => {});
    else v.pause();
  }, [active, paused]);

  useEffect(() => {
    const v = videoRef.current;
    if (v) v.muted = muted;
  }, [muted]);

  return (
    <section
      data-feed-card
      data-id={post.id}
      className="relative h-[100dvh] w-full snap-start overflow-hidden bg-black"
    >
      <video
        ref={videoRef}
        src={post.video}
        poster={post.poster}
        muted={muted}
        loop
        playsInline
        preload={priority ? "auto" : "metadata"}
        onClick={() => setPaused((p) => !p)}
        className="absolute inset-0 w-full h-full object-cover cursor-pointer"
      />
      {paused && (
        <button
          onClick={() => setPaused(false)}
          className="absolute inset-0 flex items-center justify-center bg-black/20"
          aria-label="Play"
        >
          <div className="size-16 rounded-full bg-black/50 backdrop-blur flex items-center justify-center">
            <Play className="size-7 text-white fill-white" />
          </div>
        </button>
      )}
      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 z-10 pt-[max(1rem,env(safe-area-inset-top))] px-5 flex items-center justify-between">
        <h1 className="font-display text-2xl uppercase tracking-tight italic">
          STRIVE<span className="text-accent">.</span>
        </h1>
        <button
          onClick={onToggleMute}
          className="size-8 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/80"
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </button>
      </div>

      {/* Bottom overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/30 flex flex-col justify-end p-5 pb-28 pointer-events-none">
        <div className="flex justify-between items-end gap-4 pointer-events-auto">
          <div className="space-y-3 max-w-[78%]">
            <div className="flex items-center gap-2">
              <div className="size-10 rounded-full border-2 border-accent overflow-hidden bg-secondary" />
              <div>
                <p className="font-semibold text-sm tracking-tight text-white">{post.handle}</p>
                <p className="text-[10px] font-mono text-accent uppercase">{post.meta}</p>
              </div>
              <button
                onClick={() => actions.toggleFollow(post.handle)}
                className={`ml-2 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide active:scale-95 transition-transform ${
                  following
                    ? "bg-white/10 text-white border border-white/30"
                    : "bg-accent text-accent-foreground"
                }`}
              >
                {following ? "Following" : "Follow"}
              </button>
            </div>
            <p className="text-sm font-medium leading-snug text-white text-pretty">
              {post.caption}
            </p>
            <div className="flex flex-wrap gap-2">
              {post.tags.map((t) => (
                <span
                  key={t}
                  className="px-2 py-0.5 bg-white/10 backdrop-blur-sm rounded text-[10px] font-bold uppercase tracking-wide text-white"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-5 items-center">
            <FeedAction
              icon={<Heart className={`size-5 ${liked ? "fill-accent text-accent" : ""}`} />}
              label={formatCount(likeCount)}
              onClick={() => actions.toggleLike(post.id)}
              active={liked}
            />
            <FeedAction
              icon={<MessageCircle className="size-5" />}
              label={formatCount(commentCount)}
              onClick={onOpenComments}
            />
            <FeedAction
              icon={<Bookmark className={`size-5 ${saved ? "fill-accent text-accent" : ""}`} />}
              label="Save"
              onClick={() => actions.toggleSave(post.id)}
              active={saved}
            />
            <FeedAction
              icon={<Share2 className="size-5" />}
              label="Share"
              onClick={() => {
                if (navigator.share)
                  navigator
                    .share({ title: post.handle, text: post.caption, url: window.location.href })
                    .catch(() => {});
                else navigator.clipboard?.writeText(window.location.href);
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function FeedAction({
  icon,
  label,
  onClick,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 active:scale-90 transition-transform">
      <div
        className={`size-12 rounded-full backdrop-blur-md border flex items-center justify-center text-white ${
          active ? "bg-accent/10 border-accent/40" : "bg-white/5 border-white/10"
        }`}
      >
        {icon}
      </div>
      <span className="text-[10px] font-mono text-white">{label}</span>
    </button>
  );
}

function CommentsSheet({ postId, onClose }: { postId: string; onClose: () => void }) {
  const comments = useStore((s) => s.comments[postId] ?? []);
  const [text, setText] = useState("");
  const submit = () => {
    if (!text.trim()) return;
    actions.addComment(postId, text);
    setText("");
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true">
      <button
        aria-label="Close comments"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div className="relative w-full max-h-[75dvh] bg-card border-t border-border rounded-t-2xl flex flex-col animate-snap-in">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-display uppercase italic tracking-tight">
            Comments · {comments.length}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="size-8 rounded-full bg-secondary flex items-center justify-center"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {comments.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Be the first to drop analysis.
            </p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <div className="size-8 rounded-full bg-accent/20 border border-accent/40 shrink-0" />
              <div className="flex-1">
                <p className="text-[11px] font-mono text-accent uppercase">{c.author}</p>
                <p className="text-sm leading-snug">{c.text}</p>
              </div>
            </div>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex items-center gap-2 p-3 border-t border-border pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add analysis…"
            className="flex-1 bg-secondary rounded-full px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-accent"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="size-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center disabled:opacity-40"
            aria-label="Send"
          >
            <Send className="size-4" />
          </button>
        </form>
      </div>
    </div>
  );
}