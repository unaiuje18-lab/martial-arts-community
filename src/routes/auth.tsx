import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Mail, Lock, ArrowRight, MailCheck, Sun, Moon } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { MobileShell } from "@/components/MobileShell";
import { reportLovableError } from "@/lib/lovable-error-reporting";
import { useT, useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { authErrorKey } from "@/lib/auth-errors";

const signinSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(72),
});
const signupSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
});
const emailOnlySchema = z.object({ email: z.string().trim().email().max(255) });

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
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const t = useT();
  const { lang, setLang } = useI18n();
  const { theme, toggle: toggleTheme } = useTheme();

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

  function showError(err: unknown) {
    const key = authErrorKey(err);
    const msg = t(key);
    setError(msg);
    toast.error(msg);
    reportLovableError(err, { source: `auth_${mode}` }, { handled: true });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "forgot") {
      const parsed = emailOnlySchema.safeParse({ email });
      if (!parsed.success) {
        setError(t("auth.email"));
        return;
      }
      setSubmitting(true);
      try {
        const { error: err } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (err) throw err;
        toast.success(t("auth.resetSent"));
        setMode("signin");
      } catch (err) {
        showError(err);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const schema = mode === "signup" ? signupSchema : signinSchema;
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      const msg = mode === "signup" ? t("auth.weakPassword") : t("auth.invalidCreds");
      setError(msg);
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { data, error: err } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (err) throw err;
        // Email confirmation is disabled → session is created immediately.
        // If for any reason there's no session, fall back to "check your email".
        if (!data.session) {
          setPendingEmail(parsed.data.email);
          setSubmitting(false);
          return;
        }
        navigate({ to: "/onboarding", replace: true });
        return;
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (err) throw err;
        // __root.onAuthStateChange handles the post-signin redirect (onboarding vs target).
        navigate({ to: redirect || "/", replace: true });
      }
    } catch (err) {
      showError(err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setSubmitting(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + (redirect || "/"),
      });
      if (result.error) {
        showError(result.error);
        setSubmitting(false);
        return;
      }
      if (result.redirected) return; // browser is redirecting
      navigate({ to: redirect || "/", replace: true });
    } catch (err) {
      showError(err);
      setSubmitting(false);
    }
  }

  async function resendConfirmation() {
    if (!pendingEmail) return;
    setSubmitting(true);
    try {
      const { error: err } = await supabase.auth.resend({
        type: "signup",
        email: pendingEmail,
        options: { emailRedirectTo: `${window.location.origin}/` },
      });
      if (err) throw err;
      toast.success(t("auth.resent"));
    } catch (err) {
      showError(err);
    } finally {
      setSubmitting(false);
    }
  }

  // ---- "Check your email" screen after signup ----
  if (pendingEmail) {
    return (
      <MobileShell>
        <div className="space-y-6 pt-8 text-center animate-snap-in">
          <div className="mx-auto size-16 rounded-2xl bg-accent/10 border border-accent/30 flex items-center justify-center">
            <MailCheck className="size-7 text-accent" />
          </div>
          <h1 className="font-display text-3xl uppercase tracking-tight italic">{t("auth.checkEmail")}</h1>
          <p className="text-sm text-muted-foreground px-4">
            {t("auth.checkEmailBody").replace("{email}", pendingEmail)}
          </p>
          <div className="flex flex-col gap-2 px-2">
            <button
              onClick={resendConfirmation}
              disabled={submitting}
              className="w-full h-11 rounded-xl bg-secondary border border-border text-sm font-semibold disabled:opacity-60"
            >
              {submitting ? <Loader2 className="size-4 animate-spin inline" /> : t("auth.resend")}
            </button>
            <button
              onClick={() => {
                setPendingEmail(null);
                setMode("signin");
              }}
              className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground"
            >
              {t("auth.back")}
            </button>
          </div>
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <div className="space-y-7 animate-snap-in pt-4">
        <div className="flex justify-end items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Theme"
            className="size-8 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground"
          >
            {theme === "dark" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
          </button>
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
            {mode === "signup"
              ? t("auth.signupTitle")
              : mode === "forgot"
                ? t("reset.body")
                : t("auth.signinTitle")}
          </p>
        </header>

        {mode !== "forgot" && (
          <>
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
          </>
        )}

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
          {mode !== "forgot" && (
            <label className="block">
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                {t("auth.password")}
              </span>
              <div className="mt-1 relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="password"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-secondary rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-1 focus:ring-accent"
                  placeholder="••••••••"
                  minLength={mode === "signup" ? 8 : 6}
                  required
                />
              </div>
              {mode === "signin" && (
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setMode("forgot");
                  }}
                  className="mt-2 text-[11px] font-mono uppercase tracking-widest text-muted-foreground hover:text-accent"
                >
                  {t("auth.forgot")}
                </button>
              )}
            </label>
          )}

          {error && (
            <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 rounded-xl bg-accent text-accent-foreground font-bold uppercase tracking-wide flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-60"
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
            {mode === "signup" ? t("auth.create") : mode === "forgot" ? t("auth.sendReset") : t("auth.signIn")}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          {mode === "forgot" ? (
            <button
              onClick={() => {
                setError(null);
                setMode("signin");
              }}
              className="text-accent font-semibold"
            >
              {t("auth.back")}
            </button>
          ) : mode === "signin" ? (
            <>
              {t("auth.newHere")}{" "}
              <button
                onClick={() => {
                  setError(null);
                  setMode("signup");
                }}
                className="text-accent font-semibold"
              >
                {t("auth.createOne")}
              </button>
            </>
          ) : (
            <>
              {t("auth.haveAccount")}{" "}
              <button
                onClick={() => {
                  setError(null);
                  setMode("signin");
                }}
                className="text-accent font-semibold"
              >
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