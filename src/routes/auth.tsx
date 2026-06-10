import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Mail, Lock, ArrowRight } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { MobileShell } from "@/components/MobileShell";
import { reportLovableError } from "@/lib/lovable-error-reporting";
import { auth as localAuth } from "@/lib/auth";
import { useT, useI18n } from "@/lib/i18n";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "At least 6 characters").max(72),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: typeof s.redirect === "string" ? s.redirect : "/",
  }),
  head: () => ({
    meta: [
      { title: "STRIVE — Sign in" },
      { name: "description", content: "Sign in or create your STRIVE account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const t = useT();
  const { lang, setLang } = useI18n();

  // If a session already exists, bounce to redirect target.
  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      if (data.user) navigate({ to: redirect || "/", replace: true });
    });
    return () => {
      active = false;
    };
  }, [navigate, redirect]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check your details");
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        toast.success("Account ready — welcome to STRIVE");
        navigate({ to: "/onboarding", replace: true });
        return;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
      }
      // After sign-in, send brand-new users (no local profile yet) to onboarding.
      const profile = localAuth.get();
      if (!profile?.name) {
        navigate({ to: "/onboarding", replace: true });
      } else {
        navigate({ to: redirect || "/", replace: true });
      }
    } catch (err) {
      const id = reportLovableError(err, { source: "auth_email" }, { handled: true });
      toast.error(`${(err as Error).message} · ${id}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setSubmitting(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + (redirect || "/"),
      });
      if (result.error) {
        const id = reportLovableError(result.error, { source: "auth_google" }, { handled: true });
        toast.error(`${(result.error as Error).message} · ${id}`);
        setSubmitting(false);
        return;
      }
      if (result.redirected) return; // browser is redirecting
      navigate({ to: redirect || "/", replace: true });
    } catch (err) {
      const id = reportLovableError(err, { source: "auth_google" }, { handled: true });
      toast.error(`${(err as Error).message} · ${id}`);
      setSubmitting(false);
    }
  }

  return (
    <MobileShell>
      <div className="space-y-7 animate-snap-in pt-4">
        <div className="flex justify-end">
          <div className="inline-flex rounded-full bg-secondary border border-border p-0.5 text-[10px] font-mono uppercase tracking-widest">
            <button
              onClick={() => setLang("en")}
              className={`px-3 py-1 rounded-full ${lang === "en" ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
            >
              EN
            </button>
            <button
              onClick={() => setLang("es")}
              className={`px-3 py-1 rounded-full ${lang === "es" ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
            >
              ES
            </button>
          </div>
        </div>
        <header className="space-y-2 text-center">
          <h1 className="font-display text-4xl uppercase tracking-tight italic">
            STRIVE<span className="text-accent">.</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === "signin" ? t("auth.signinTitle") : t("auth.signupTitle")}
          </p>
        </header>

        <button
          onClick={handleGoogle}
          disabled={submitting}
          className="w-full h-12 rounded-xl bg-white text-black font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60"
        >
          <GoogleIcon /> {t("auth.continueGoogle")}
        </button>

        <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> {t("auth.or")} <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{t("auth.email")}</span>
            <div className="mt-1 relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-secondary rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-1 focus:ring-accent"
                placeholder="you@example.com"
                required
              />
            </div>
          </label>
          <label className="block">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{t("auth.password")}</span>
            <div className="mt-1 relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-secondary rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-1 focus:ring-accent"
                placeholder="••••••••"
                minLength={6}
                required
              />
            </div>
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 rounded-xl bg-accent text-accent-foreground font-bold uppercase tracking-wide flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-60"
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
            {mode === "signin" ? t("auth.signIn") : t("auth.create")}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          {mode === "signin" ? (
            <>
              {t("auth.newHere")}{" "}
              <button onClick={() => setMode("signup")} className="text-accent font-semibold">
                {t("auth.createOne")}
              </button>
            </>
          ) : (
            <>
              {t("auth.haveAccount")}{" "}
              <button onClick={() => setMode("signin")} className="text-accent font-semibold">
                {t("auth.signIn")}
              </button>
            </>
          )}
        </p>

        <p className="text-center text-[10px] font-mono text-muted-foreground/70">
          <Link to="/">{t("auth.backFeed")}</Link>
        </p>
      </div>
    </MobileShell>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.25 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.4l2.6-2.5C16.8 3.5 14.6 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12s4.3 9.5 9.5 9.5c5.5 0 9.1-3.8 9.1-9.3 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  );
}