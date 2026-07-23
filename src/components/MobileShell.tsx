import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

/**
 * Mobile-first shell. On tablet/desktop we keep the mobile column (max 480px)
 * centered and paint a subtle gradient backdrop on the sides so the app
 * doesn't look empty on wide screens.
 */
export function MobileShell({
  children,
  fullBleed = false,
}: {
  children: ReactNode;
  fullBleed?: boolean;
}) {
  return (
    <div className="min-h-dvh bg-background text-foreground sm:bg-gradient-to-br sm:from-background sm:via-background sm:to-secondary/40">
      <div className="mx-auto w-full max-w-[480px] min-h-dvh relative bg-background sm:shadow-2xl sm:shadow-black/20 sm:border-x sm:border-border/40">
        <main className={fullBleed ? "" : "pb-28 pt-4 px-5"}>{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}