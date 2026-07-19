import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { fetchCategoryBySlug } from "@/lib/techniques";

export const Route = createFileRoute("/technique-category/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — Techniques` },
      { name: "description", content: `Browse BJJ techniques in ${params.slug}.` },
    ],
  }),
  component: CategoryPage,
  errorComponent: ({ error }) => (
    <div role="alert" className="p-6 text-sm text-destructive">{error.message}</div>
  ),
  notFoundComponent: () => <div className="p-6 text-sm">Category not found.</div>,
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ["technique-category", slug],
    queryFn: () => fetchCategoryBySlug(slug),
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
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !data ? (
          <p className="text-sm text-muted-foreground">Category not found.</p>
        ) : (
          <>
            <header className="space-y-1">
              <p className="text-[10px] font-mono text-accent uppercase tracking-widest">BJJ</p>
              <h1 className="font-display text-4xl uppercase tracking-tight italic">{data.name}</h1>
              {data.description && (
                <p className="text-sm text-muted-foreground">{data.description}</p>
              )}
            </header>
            <ul className="space-y-2">
              {[...data.techniques]
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((t) => (
                  <li key={t.id}>
                    <Link
                      to="/technique/$slug"
                      params={{ slug: t.slug }}
                      className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border hover:border-accent/40"
                    >
                      <div>
                        <p className="font-semibold text-sm">{t.name}</p>
                        <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                          {t.from_position ?? "—"}
                          {t.aka?.length ? ` · ${t.aka.join(", ")}` : ""}
                        </p>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
            </ul>
          </>
        )}
      </div>
    </MobileShell>
  );
}