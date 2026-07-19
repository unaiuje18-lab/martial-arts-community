import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search as SearchIcon, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { ARTS, formatCount } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { fetchAllTechniques, fetchCategories } from "@/lib/techniques";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "STRIVE — Search" },
      { name: "description", content: "Search techniques, martial arts, and creators." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const [q, setQ] = useState("");
  const [art, setArt] = useState<string | null>(null);
  const [tab, setTab] = useState<"videos" | "techniques">("videos");
  const userPosts = useStore((s) => s.userPosts);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    return userPosts.filter((p) => {
      if (art && p.art !== art) return false;
      if (!term) return true;
      return (
        p.caption.toLowerCase().includes(term) ||
        p.handle.toLowerCase().includes(term) ||
        p.tags.some((t) => t.toLowerCase().includes(term)) ||
        p.art.toLowerCase().includes(term)
      );
    });
  }, [q, art, userPosts]);

  const categoriesQ = useQuery({
    queryKey: ["technique-categories", "bjj"],
    queryFn: () => fetchCategories("bjj"),
    enabled: tab === "techniques",
  });
  const techniquesQ = useQuery({
    queryKey: ["all-techniques", "bjj"],
    queryFn: () => fetchAllTechniques("bjj"),
    enabled: tab === "techniques",
  });

  const techMatches = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term || !techniquesQ.data) return [];
    return techniquesQ.data
      .filter(
        (t) =>
          t.name.toLowerCase().includes(term) ||
          t.slug.includes(term) ||
          (t.from_position ?? "").toLowerCase().includes(term) ||
          t.aka.some((a) => a.toLowerCase().includes(term)),
      )
      .slice(0, 40);
  }, [q, techniquesQ.data]);

  return (
    <MobileShell>
      <div className="space-y-6 animate-snap-in">
        <header className="space-y-3">
          <h1 className="font-display text-4xl uppercase tracking-tight italic">Search</h1>
          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={tab === "techniques" ? "kimura, half guard, heel hook…" : "Try: kimura from half guard"}
              className="w-full bg-secondary/60 border border-border rounded-xl pl-11 pr-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Chip active={tab === "videos"} onClick={() => setTab("videos")} label="Videos" />
            <Chip active={tab === "techniques"} onClick={() => setTab("techniques")} label="BJJ Techniques" />
          </div>
        </header>

        {tab === "videos" && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5">
            <Chip active={art === null} onClick={() => setArt(null)} label="All" />
            {ARTS.map((a) => (
              <Chip key={a} active={art === a} onClick={() => setArt(a)} label={a} />
            ))}
          </div>
        )}

        {tab === "videos" && (
          <section className="grid grid-cols-2 gap-3">
          {results.map((p) => (
            <article
              key={p.id}
              className="relative aspect-[9/14] rounded-xl overflow-hidden bg-secondary group"
            >
              <img
                src={p.poster}
                alt=""
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-3 space-y-1">
                <p className="text-[10px] font-mono text-accent uppercase">{p.art}</p>
                <p className="text-xs font-semibold leading-tight line-clamp-2">{p.caption}</p>
                <p className="text-[10px] text-white/60 font-mono">{formatCount(p.likes)} likes</p>
              </div>
            </article>
          ))}
          {results.length === 0 && (
            <p className="col-span-2 text-center text-sm text-muted-foreground py-12">
              No results. Try a different technique.
            </p>
          )}
          </section>
        )}

        {tab === "techniques" && (
          <section className="space-y-4">
            {q.trim() ? (
              <div className="space-y-2">
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                  Matches ({techMatches.length})
                </p>
                {techMatches.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">
                    No techniques match "{q}".
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {techMatches.map((t) => (
                      <li key={t.id}>
                        <Link
                          to="/technique/$slug"
                          params={{ slug: t.slug }}
                          className="flex items-center justify-between p-3 rounded-xl bg-card border border-border"
                        >
                          <div>
                            <p className="text-sm font-semibold">{t.name}</p>
                            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                              {t.category.name}
                              {t.from_position ? ` · ${t.from_position}` : ""}
                            </p>
                          </div>
                          <ChevronRight className="size-4 text-muted-foreground" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                  Categories
                </p>
                {categoriesQ.isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : (
                  <ul className="space-y-2">
                    {(categoriesQ.data ?? []).map((c) => (
                      <li key={c.id}>
                        <Link
                          to="/technique-category/$slug"
                          params={{ slug: c.slug }}
                          className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border hover:border-accent/40"
                        >
                          <div>
                            <p className="font-semibold text-sm">{c.name}</p>
                            {c.description && (
                              <p className="text-[10px] text-muted-foreground">{c.description}</p>
                            )}
                          </div>
                          <ChevronRight className="size-4 text-muted-foreground" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </MobileShell>
  );
}

function Chip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-colors ${
        active
          ? "bg-accent text-accent-foreground"
          : "bg-secondary border border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

