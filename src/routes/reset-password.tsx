import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lock, Loader2, ArrowRight } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MobileShell } from "@/components/MobileShell";
import { useT } from "@/lib/i18n";
import { authErrorKey } from "@/lib/auth-errors";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "STRIVE — Reset password" },
      { name: "description", content: "Set a new password for your STRIVE account." },
    ],
  }),
  component: ResetPasswordPage,
});

const schema = z
  .object({
    password: z.string().min(8, "min8").max(72),
    confirm: z.string().min(8).max(72),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "mismatch" });

function ResetPasswordPage() {
  const t = useT();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Supabase emits PASSWORD_RECOVERY when arriving from a recovery link.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
        if (timer) clearTimeout(timer);
      }
    });
    // If we already have a session (link consumed), allow update too.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    // After a short wait, if we still don't have either, surface invalid-link UI.
    timer = setTimeout(() => setInvalid((prev) => prev || !ready), 2500);
    return () => {
      sub.subscription.unsubscribe();
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ password, confirm });
    if (!parsed.success) {
      const code = parsed.error.issues[0]?.message;
      toast.error(code === "mismatch" ? t("reset.mismatch") : t("auth.weakPassword"));
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
      if (error) throw error;
      toast.success(t("reset.success"));
      navigate({ to: "/", replace: true });
    } catch (err) {
      toast.error(t(authErrorKey(err)));
    } finally {
      setSubmitting(false);
    }
  }

  if (invalid && !ready) {
    return (
      <MobileShell>
        <div className="space-y-6 text-center pt-8">
          <h1 className="font-display text-3xl uppercase tracking-tight italic">{t("reset.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("reset.invalidLink")}</p>
          <Link
            to="/auth"
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-accent text-accent-foreground font-bold uppercase tracking-wide text-sm"
          >
            {t("auth.signIn")}
          </Link>
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <div className="space-y-6 pt-4">
        <header className="space-y-2 text-center">
          <h1 className="font-display text-3xl uppercase tracking-tight italic">{t("reset.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("reset.body")}</p>
        </header>

        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              {t("reset.new")}
            </span>
            <div className="mt-1 relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
                className="w-full bg-secondary rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </label>
          <label className="block">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              {t("reset.confirm")}
            </span>
            <div className="mt-1 relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                minLength={8}
                required
                className="w-full bg-secondary rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </label>
          <button
            type="submit"
            disabled={submitting || !ready}
            className="w-full h-12 rounded-xl bg-accent text-accent-foreground font-bold uppercase tracking-wide flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
            {t("reset.update")}
          </button>
        </form>
      </div>
    </MobileShell>
  );
}