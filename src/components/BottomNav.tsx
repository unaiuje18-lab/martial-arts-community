import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Search, Swords, Plus, User, type LucideIcon } from "lucide-react";
import { useT, type TKey } from "@/lib/i18n";

type NavItem = {
  to: "/" | "/search" | "/duels" | "/create" | "/profile";
  icon: LucideIcon;
  label: TKey;
};

const items: NavItem[] = [
  { to: "/", icon: Home, label: "nav.home" },
  { to: "/search", icon: Search, label: "nav.search" },
  { to: "/create", icon: Plus, label: "nav.create" },
  { to: "/duels", icon: Swords, label: "nav.duels" },
  { to: "/profile", icon: User, label: "nav.profile" },
];

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const t = useT();

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-background/85 backdrop-blur-xl border-t border-border px-6 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex justify-between items-center z-50"
      aria-label="Primary"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.to;
        const isCreate = item.to === "/create";
        const label = t(item.label);

        if (isCreate) {
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-label={label}
              className="size-12 -mt-7 rounded-2xl bg-accent text-accent-foreground flex items-center justify-center shadow-lg shadow-accent/30 border-4 border-background active:scale-95 transition-transform"
            >
              <Icon className="size-6" strokeWidth={2.5} />
            </Link>
          );
        }

        return (
          <Link
            key={item.to}
            to={item.to}
            aria-label={label}
            className={`flex flex-col items-center gap-0.5 transition-colors ${
              active ? "text-accent" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="size-5" strokeWidth={active ? 2.5 : 2} />
            <span className="text-[9px] font-mono uppercase tracking-wider">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}