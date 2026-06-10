import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { ARTS, LEVELS, CONTENT_PREFS, type Art } from "@/lib/mock-data";
import { auth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useT, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "STRIVE — Get Started" },
      { name: "description", content: "Set up your fighter profile in under a minute." },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const t = useT();
  const { lang, setLang } = useI18n();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [birthday, setBirthday] = useState("");
  const [arts, setArts] = useState<Art[]>([]);
  const [level, setLevel] = useState<(typeof LEVELS)[number] | null>(null);
  const [prefs, setPrefs] = useState<string[]>([]);

  const stepKeys = ["onb.identity", "onb.disciplines", "onb.skill", "onb.interests"] as const;
  const steps = stepKeys.map((k) => t(k));

  const next = async () => {
    if (step < steps.length - 1) setStep((s) => s + 1);
    else {
      const age = birthday ? String(computeAge(birthday)) : "";
      auth.signIn({
        name,
        username,
        age,
        birthday,
        arts,
        level: level ?? undefined,
        prefs,
      });
      // Persist core public profile fields to backend so they survive devices.
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        const cleanHandle = username.trim().replace(/\s/g, "_").toLowerCase();
        const { error } = await supabase
          .from("profiles")
          .update({
            display_name: name.trim() || null,
            handle: cleanHandle || u.user.email?.split("@")[0] || "user",
            primary_art: arts[0] ?? null,
          })
          .eq("id", u.user.id);
        if (error) toast.error(`Profile not saved: ${error.message}`);
      }
      navigate({ to: "/" });
    }
  };

  const canContinue =
    (step === 0 && name && username && birthday && computeAge(birthday) >= 5) ||
    (step === 1 && arts.length > 0) ||
    (step === 2 && level) ||
    (step === 3 && prefs.length > 0);

  return (
    <MobileShell>
      <div className="space-y-7 animate-snap-in">
        <div className="flex justify-end">
          <div className="inline-flex rounded-full bg-secondary border border-border p-0.5 text-[10px] font-mono uppercase tracking-widest">
            <button
              type="button"
              onClick={() => setLang("en")}
              className={`px-3 py-1 rounded-full ${lang === "en" ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLang("es")}
              className={`px-3 py-1 rounded-full ${lang === "es" ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
            >
              ES
            </button>
          </div>
        </div>
        <header className="space-y-3">
          <p className="text-[10px] font-mono text-accent uppercase tracking-widest">
            {t("onb.step")} {step + 1} / {steps.length}
          </p>
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full ${i <= step ? "bg-accent" : "bg-white/10"}`}
              />
            ))}
          </div>
          <h1 className="font-display text-4xl uppercase tracking-tight italic">{steps[step]}</h1>
        </header>

        {step === 0 && (
          <div className="space-y-3">
            <Field label={t("onb.name")}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Elias Thorne"
                className="onboarding-input"
              />
            </Field>
            <Field label={t("onb.username")}>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/\s/g, "_").toLowerCase())}
                placeholder="kai_zen"
                className="onboarding-input"
              />
            </Field>
            <Field label={t("onb.birthday")}>
              <input
                type="date"
                value={birthday}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setBirthday(e.target.value)}
                className="onboarding-input"
              />
            </Field>
            <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3 flex items-baseline justify-between">
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                {t("onb.ageAuto")}
              </span>
              <span className="font-display text-2xl tracking-tight text-accent">
                {birthday ? computeAge(birthday) : "—"}
              </span>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-wrap gap-2">
            {ARTS.map((a) => {
              const sel = arts.includes(a);
              return (
                <button
                  key={a}
                  onClick={() =>
                    setArts((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a]))
                  }
                  className={`px-4 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wide border transition-colors ${
                    sel
                      ? "bg-accent text-accent-foreground border-accent"
                      : "bg-card border-border text-muted-foreground"
                  }`}
                >
                  {a}
                </button>
              );
            })}
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-3">
            {LEVELS.map((l) => {
              const sel = level === l;
              return (
                <button
                  key={l}
                  onClick={() => setLevel(l)}
                  className={`p-5 rounded-2xl border text-left transition-all ${
                    sel
                      ? "bg-accent/10 border-accent ring-2 ring-accent/40"
                      : "bg-card border-border"
                  }`}
                >
                  <p className="font-display text-2xl uppercase tracking-tight">{l}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {l === "Beginner" && "Less than 1 year of training"}
                    {l === "Intermediate" && "1–4 years, drilling fundamentals"}
                    {l === "Advanced" && "4+ years, competing and teaching"}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-wrap gap-2">
            {CONTENT_PREFS.map((p) => {
              const sel = prefs.includes(p);
              return (
                <button
                  key={p}
                  onClick={() =>
                    setPrefs((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]))
                  }
                  className={`px-4 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wide border transition-colors ${
                    sel
                      ? "bg-accent text-accent-foreground border-accent"
                      : "bg-card border-border text-muted-foreground"
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>
        )}

        <button
          onClick={next}
          disabled={!canContinue}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-accent text-accent-foreground font-bold uppercase tracking-wider text-sm disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
        >
          {step === steps.length - 1 ? t("onb.enter") : t("onb.continue")}
          <ArrowRight className="size-4" strokeWidth={2.5} />
        </button>
      </div>

      <style>{`
        .onboarding-input {
          width: 100%;
          background: color-mix(in oklch, var(--secondary) 60%, transparent);
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          padding: 0.875rem 1rem;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .onboarding-input:focus {
          border-color: color-mix(in oklch, var(--accent) 60%, transparent);
          box-shadow: 0 0 0 3px color-mix(in oklch, var(--accent) 20%, transparent);
        }
        .onboarding-input::placeholder { color: var(--muted-foreground); }
      `}</style>
    </MobileShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
        {label}
      </span>
      {children}
    </label>
  );
}

function computeAge(birthday: string): number {
  const b = new Date(birthday);
  if (Number.isNaN(b.getTime())) return 0;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return Math.max(0, age);
}