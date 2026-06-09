import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

export function MobileShell({
  children,
  fullBleed = false,
}: {
  children: ReactNode;
  fullBleed?: boolean;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[480px] min-h-screen relative">
        <main className={fullBleed ? "" : "pb-28 pt-4 px-5"}>{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}