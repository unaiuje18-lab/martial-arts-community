import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Play } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { fetchPostsForTechnique, fetchTechniqueBySlug } from "@/lib/techniques";

export const Route = createFileRoute("/technique/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — Videos` },
      { name: "description", content: `Videos of the ${params.slug} technique.` },
    ],
  }),
  component: TechniquePage,
  errorComponent: ({ error }) => (
    <div role="alert" className="p-6 text-sm text-destructive">{error.message}</div>
  ),
  notFoundComponent: () => <div className="p-6 text-sm">Technique not found.</div>,
});

function TechniquePage() {
  const { slug } = Route.useParams();
  const router = useRouter();
  const info = useQuery({
    queryKey: ["technique", slug],
    queryFn: () => fetchTechniqueBySlug(slug),
  });
  const videos = useQuery({
    queryKey: ["technique-posts", info.data?.id],
    queryFn: () => fetchPostsForTechnique(info.data!.id),
    enabled: !!info.data?.id,
  });

  return (
    <MobileShell>
      <div className="space-y-5 animate-snap-in">
        <button
          onClick={() => router.history.back()}
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <ArrowLeft className="size-3.5" /> Back
        </button>
        {info.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !info.data ? (
          <p className="text-sm text-muted-foreground">Technique not found.</p>
        ) : (
          <>
            <header className="space-y-1">
              <p className="text-[10px] font-mono text-accent uppercase tracking-widest">
                {info.data.category?.name ?? "BJJ"}
              </p>
              <h1 className="font-display text-4xl uppercase tracking-tight italic">
                {info.data.name}
              </h1>
              {info.data.from_position && (
                <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  from {info.data.from_position}
                </p>
              )}
            </header>

            <section>
              {videos.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading videos…</p>
              ) : !videos.data?.length ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No videos yet with this technique. Be the first to upload one.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {videos.data.map((p) => (
                    <article
                      key={p.id}
                      className="relative aspect-[9/14] rounded-xl overflow-hidden bg-secondary"
                    >
                      {p.poster && (
                        <img src={p.poster} alt="" loading="lazy"
                          className="absolute inset-0 w-full h-full object-cover" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent" />
                      <div className="absolute top-2 right-2 size-7 rounded-full bg-black/50 flex items-center justify-center">
                        <Play className="size-3.5 text-white" />
                      </div>
                      <div className="absolute inset-x-0 bottom-0 p-3 space-y-0.5">
                        <p className="text-[10px] font-mono text-accent uppercase">{p.handle}</p>
                        <p className="text-xs font-semibold leading-tight line-clamp-2 text-white">
                          {p.caption}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </MobileShell>
  );
}