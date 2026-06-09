import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, MessageCircle, Bookmark, Share2, Volume2 } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { FEED, formatCount, type FeedPost } from "@/lib/mock-data";

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
  return (
    <MobileShell fullBleed>
      <div
        className="h-[100dvh] overflow-y-scroll snap-y snap-mandatory no-scrollbar"
        aria-label="Video feed"
      >
        {FEED.map((post, i) => (
          <FeedCard key={post.id} post={post} priority={i === 0} />
        ))}
      </div>
    </MobileShell>
  );
}

function FeedCard({ post, priority }: { post: FeedPost; priority: boolean }) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <section className="relative h-[100dvh] w-full snap-start overflow-hidden">
      <img
        src={post.poster}
        alt=""
        width={768}
        height={1344}
        loading={priority ? "eager" : "lazy"}
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 z-10 pt-[max(1rem,env(safe-area-inset-top))] px-5 flex items-center justify-between">
        <h1 className="font-display text-2xl uppercase tracking-tight italic">
          STRIVE<span className="text-accent">.</span>
        </h1>
        <button
          className="size-8 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/80"
          aria-label="Mute audio"
        >
          <Volume2 className="size-4" />
        </button>
      </div>

      {/* Bottom overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/30 flex flex-col justify-end p-5 pb-28">
        <div className="flex justify-between items-end gap-4">
          <div className="space-y-3 max-w-[78%]">
            <div className="flex items-center gap-2">
              <div className="size-10 rounded-full border-2 border-accent overflow-hidden bg-secondary" />
              <div>
                <p className="font-semibold text-sm tracking-tight text-white">{post.handle}</p>
                <p className="text-[10px] font-mono text-accent uppercase">{post.meta}</p>
              </div>
              <button className="ml-2 bg-accent text-accent-foreground text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide active:scale-95 transition-transform">
                Follow
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
              label={formatCount(post.likes + (liked ? 1 : 0))}
              onClick={() => setLiked((v) => !v)}
              active={liked}
            />
            <FeedAction
              icon={<MessageCircle className="size-5" />}
              label={formatCount(post.comments)}
            />
            <FeedAction
              icon={<Bookmark className={`size-5 ${saved ? "fill-accent text-accent" : ""}`} />}
              label="Save"
              onClick={() => setSaved((v) => !v)}
              active={saved}
            />
            <FeedAction icon={<Share2 className="size-5" />} label="Share" />
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
