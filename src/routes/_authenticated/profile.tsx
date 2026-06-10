import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { Lock, Flame, Award, Pencil, X, Check, Camera, Plus, Trash2, Download, LogOut } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { BADGES, formatCount, ARTS, LEVELS, CONTENT_PREFS, BELT_SYSTEMS, hasBelts, type Art } from "@/lib/mock-data";
import { auth, useUser } from "@/lib/auth";
import { useSupabaseUser } from "@/hooks/use-supabase-user";
import { useI18n, useT } from "@/lib/i18n";
import { useStore, computeStreak } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { uploadMedia } from "@/lib/media-upload";
import { processImage } from "@/lib/image";
import { authErrorKey } from "@/lib/auth-errors";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { jsPDF } from "jspdf";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "STRIVE — Profile" },
      { name: "description", content: "Your fighter profile, achievements, and stats." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const user = useUser();
  const { user: authUser, profile } = useSupabaseUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const sessions = useStore((s) => s.sessions);
  const userPosts = useStore((s) => s.userPosts);
  const { lang, setLang } = useI18n();
  const t = useT();

  const name = user?.name ?? profile?.display_name ?? "";
  const username = user?.username ?? profile?.handle ?? authUser?.email?.split("@")[0] ?? "";
  const bio = user?.bio ?? profile?.bio ?? "";
  const avatar = user?.avatar ?? profile?.avatar_url ?? undefined;
  const arts = (user?.arts as Art[]) ?? [];
  const ranks = user?.ranks ?? {};

  // Derived, earned stats — start at 0 and grow with real activity.
  const sessionsCount = sessions.length;
  const streak = computeStreak(sessions);
  const xp = sessionsCount * 50 + userPosts.length * 25;
  const level = Math.floor(xp / 500) + 1;
  const xpToNext = level * 500;
  const xpPct = Math.min(100, Math.round((xp / xpToNext) * 100));
  const followers = 0;
  const following = 0;

  // Earned badges derive from real activity.
  const earnedBadges: Record<string, boolean> = {
    b1: userPosts.length >= 1,
    b2: streak >= 10,
    b3: false,
    b4: sessionsCount >= 30,
    b5: false,
    b6: false,
  };

  // Brand-new user with no profile yet → finish onboarding first.
  if (authUser && !name) {
    return <Navigate to="/onboarding" replace />;
  }

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  }

  return (
    <MobileShell>
      <div className="space-y-7 animate-snap-in">
        <header className="flex items-start justify-between">
          <h1 className="font-display text-4xl uppercase tracking-tight italic">{t("profile.title")}</h1>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-full bg-secondary border border-border p-0.5 text-[10px] font-mono uppercase tracking-widest" aria-label={t("profile.language")}>
              <button
                onClick={() => setLang("en")}
                className={`px-2.5 py-1 rounded-full ${lang === "en" ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
              >
                EN
              </button>
              <button
                onClick={() => setLang("es")}
                className={`px-2.5 py-1 rounded-full ${lang === "es" ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
              >
                ES
              </button>
            </div>
            <button
              onClick={handleSignOut}
              aria-label={t("profile.signOut")}
              className="size-9 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <LogOut className="size-4" />
            </button>
            <Sheet open={open} onOpenChange={setOpen}>
            <button
              onClick={() => setOpen(true)}
              aria-label={t("profile.edit")}
              className="size-9 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground"
            >
              <Pencil className="size-4" />
            </button>
            <SheetContent side="bottom" className="rounded-t-3xl border-t border-border bg-background max-h-[90dvh] overflow-y-auto">
              <SheetHeader className="text-left">
                <SheetTitle className="font-display text-2xl uppercase tracking-tight italic">Edit Profile</SheetTitle>
                <SheetDescription>Update your public fighter info.</SheetDescription>
              </SheetHeader>
              <EditProfileForm onClose={() => setOpen(false)} />
            </SheetContent>
            </Sheet>
          </div>
        </header>

        {/* Identity */}
        <section className="flex items-start gap-4">
          {avatar ? (
            <img
              src={avatar}
              alt={name}
              width={80}
              height={80}
              className="size-20 rounded-2xl object-cover border-4 border-white/5"
            />
          ) : (
            <div className="size-20 rounded-2xl border-4 border-white/5 bg-secondary flex items-center justify-center font-display text-3xl uppercase text-muted-foreground">
              {(name || username || "?").slice(0, 1)}
            </div>
          )}
          <div className="flex-1 pt-1 space-y-1">
            <h2 className="font-display text-2xl uppercase tracking-tight leading-none">{name}</h2>
            <p className="text-xs font-mono text-muted-foreground">@{username}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-accent font-mono text-xs font-bold">LVL {level}</span>
              <div className="w-28 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-accent" style={{ width: `${xpPct}%` }} />
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">{xp}/{xpToNext}</span>
            </div>
          </div>
        </section>

        {bio ? (
          <p className="text-sm text-foreground/80 text-pretty">{bio}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">Add a bio from Edit profile.</p>
        )}

        <div className="space-y-2">
          <div className="flex gap-2 flex-wrap">
            {arts.map((a) => {
              const r = ranks[a];
              const sysList = BELT_SYSTEMS[a];
              const sysLabel = sysList && sysList.length > 1
                ? sysList.find((s) => s.id === r?.system)?.id?.toUpperCase()
                : undefined;
              const suffix = r?.value
                ? r.type === "belt"
                  ? ` · ${r.value}${sysLabel ? ` (${sysLabel})` : ""}`
                  : ` · ${r.value}Y`
                : "";
              return (
                <span
                  key={a}
                  className="px-2.5 py-1 bg-secondary border border-border rounded text-[10px] font-bold uppercase tracking-wide"
                >
                  {a}
                  {suffix && <span className="text-accent">{suffix}</span>}
                </span>
              );
            })}
          </div>
          {arts.some((a) => (ranks[a]?.history?.length ?? 0) > 0) && (
            <div className="rounded-xl border border-border bg-card/50 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">
                  Belt timeline
                </p>
                <button
                  type="button"
                  onClick={() => exportBeltTimelinePdf(name, arts, ranks)}
                  className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-accent hover:underline"
                >
                  <Download className="size-3" /> PDF
                </button>
              </div>
              {arts.map((a) => {
                const hist = ranks[a]?.history ?? [];
                if (!hist.length) return null;
                const sorted = [...hist].sort((x, y) => x.date.localeCompare(y.date));
                const first = sorted[0];
                const last = sorted[sorted.length - 1];
                return (
                  <div key={a} className="text-xs space-y-2">
                    <p className="font-bold uppercase tracking-wide text-[10px] text-muted-foreground">
                      {a}
                    </p>
                    <div className="grid grid-cols-3 gap-1.5">
                      <SummaryCell label="Current" value={last.belt} sub={formatYearMonth(last.date)} accent />
                      <SummaryCell label="First" value={first.belt} sub={formatYearMonth(first.date)} />
                      <SummaryCell label="Promotions" value={String(Math.max(0, sorted.length - 1))} sub={`${sorted.length} entries`} />
                    </div>
                    <ol className="relative border-l border-border ml-1.5 pl-3 space-y-1">
                      {sorted.map((h, i) => (
                        <li key={i} className="flex items-baseline justify-between gap-2">
                          <span className="font-bold">{h.belt}</span>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {formatYearMonth(h.date)}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Follow stats */}
        <div className="flex items-center gap-6 text-sm">
          <div><span className="font-bold">{formatCount(followers)}</span> <span className="text-muted-foreground">followers</span></div>
          <div><span className="font-bold">{formatCount(following)}</span> <span className="text-muted-foreground">following</span></div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Streak" value={`${streak}D`} accent />
          <Stat label="Sessions" value={String(sessionsCount)} />
          <Stat label="XP" value={formatCount(xp)} />
        </div>

        {/* Private tracker entry */}
        <a
          href="/tracker"
          className="block w-full rounded-2xl bg-gradient-to-br from-primary/30 via-card to-card border border-primary/30 p-4 active:scale-[0.99] transition-transform"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Flame className="size-5 text-accent" />
              </div>
              <div>
                <p className="font-semibold text-sm">Private Training Tracker</p>
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Lock className="size-3" /> Only visible to you
                </p>
              </div>
            </div>
            <span className="text-accent text-xs font-bold">OPEN</span>
          </div>
        </a>

        {/* Badges */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl uppercase italic tracking-tight">Badges</h3>
            <span className="text-[10px] font-mono text-muted-foreground">
              {BADGES.filter((b) => earnedBadges[b.id]).length}/{BADGES.length}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {BADGES.map((b) => {
              const earned = earnedBadges[b.id];
              return (
              <div
                key={b.id}
                className={`aspect-square rounded-xl border flex flex-col items-center justify-center p-2 gap-1.5 text-center ${
                  earned
                    ? "bg-accent/10 border-accent/30"
                    : "bg-secondary/40 border-border opacity-50"
                }`}
              >
                <Award className={`size-6 ${earned ? "text-accent" : "text-muted-foreground"}`} />
                <p className={`text-[9px] font-mono uppercase leading-tight ${earned ? "text-foreground" : "text-muted-foreground"}`}>
                  {b.label}
                </p>
              </div>
              );
            })}
          </div>
        </section>
      </div>
    </MobileShell>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-card border border-border p-4 rounded-2xl">
      <p className="text-[10px] font-mono text-muted-foreground uppercase mb-1">{label}</p>
      <p className={`font-display text-2xl tracking-tight leading-none ${accent ? "text-accent" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function EditProfileForm({ onClose }: { onClose: () => void }) {
  const user = useUser();
  const t = useT();
  const { user: authUser } = useSupabaseUser();
  const [name, setName] = useState(user?.name ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [arts, setArts] = useState<Art[]>((user?.arts as Art[]) ?? []);
  const [age, setAge] = useState(user?.age ?? "");
  const [level, setLevel] = useState<string>(user?.level ?? "Intermediate");
  const [prefs, setPrefs] = useState<string[]>(user?.prefs ?? []);
  const [avatar, setAvatar] = useState<string | undefined>(user?.avatar);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [changingPw, setChangingPw] = useState(false);
  type RankEntry = {
    type: "belt" | "years";
    value: string;
    system?: string;
    history?: { belt: string; date: string }[];
  };
  const [ranks, setRanks] = useState<Record<string, RankEntry>>(
    user?.ranks ?? {},
  );
  const fileRef = useRef<HTMLInputElement>(null);

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setAvatarBusy(true);
    try {
      // Validate + compress to ≤512px square-ish, then upload to cloud.
      const processed = await processImage(f, { maxDim: 512, thumbDim: 256, quality: 0.85 });
      const blob = await (await fetch(processed.full)).blob();
      const { url } = await uploadMedia(blob, {
        folder: "avatars",
        filename: `avatar-${authUser?.id ?? "me"}`,
        contentType: blob.type || "image/webp",
      });
      setAvatar(url);
    } catch (err) {
      toast.error((err as Error).message || t("profile.avatarError"));
    } finally {
      setAvatarBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const save = async () => {
    // Validate ranks against active belt system; drop invalid values.
    const cleanRanks: Record<string, RankEntry> = {};
    for (const [art, r] of Object.entries(ranks)) {
      const systems = BELT_SYSTEMS[art as Art];
      if (systems) {
        const sys = systems.find((s) => s.id === r.system) ?? systems[0];
        const validValue = sys.belts.includes(r.value) ? r.value : "";
        const validHistory = (r.history ?? []).filter((h) => sys.belts.includes(h.belt));
        if (validValue || validHistory.length) {
          cleanRanks[art] = { type: "belt", value: validValue, system: sys.id, history: validHistory };
        }
      } else if (r.value) {
        cleanRanks[art] = { type: "years", value: r.value };
      }
    }
    const cleanName = name.trim();
    const cleanHandle = username.trim().replace(/\s/g, "_").toLowerCase();
    setSaving(true);
    try {
      // 1. Local-first update so the UI reflects changes immediately.
      auth.update({
        name: cleanName,
        username: cleanHandle,
        bio: bio.trim(),
        arts,
        age: age.trim(),
        level,
        prefs,
        avatar,
        ranks: cleanRanks,
      });
      // 2. Persist the public-facing fields to the backend so they sync across devices.
      if (authUser) {
        const { error } = await supabase
          .from("profiles")
          .update({
            display_name: cleanName || null,
            handle: cleanHandle || authUser.email?.split("@")[0] || "user",
            bio: bio.trim() || null,
            primary_art: arts[0] ?? null,
            avatar_url: avatar ?? null,
          })
          .eq("id", authUser.id);
        if (error) throw error;
      }
      toast.success(t("profile.saved"));
      onClose();
    } catch (err) {
      toast.error((err as Error).message || t("profile.saveError"));
    } finally {
      setSaving(false);
    }
  };

  async function changePassword() {
    if (newPassword.length < 8) {
      toast.error(t("auth.weakPassword"));
      return;
    }
    setChangingPw(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      toast.success(t("profile.passwordUpdated"));
    } catch (err) {
      toast.error(t(authErrorKey(err)));
    } finally {
      setChangingPw(false);
    }
  }

  const toggleArt = (a: Art) => {
    setArts((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
  };
  const togglePref = (p: string) => {
    setPrefs((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const setRankValue = (art: Art, value: string, system?: string) => {
    setRanks((prev) => ({
      ...prev,
      [art]: {
        ...(prev[art] ?? {}),
        type: hasBelts(art) ? "belt" : "years",
        value,
        system,
      },
    }));
  };
  const setRankSystem = (art: Art, system: string) => {
    setRanks((prev) => ({
      ...prev,
      [art]: { type: "belt", value: "", system, history: [] },
    }));
  };
  const addHistoryEntry = (art: Art, belt: string, date: string) => {
    if (!belt || !date) return;
    setRanks((prev) => {
      const cur = prev[art] ?? { type: "belt" as const, value: "" };
      const hist = [...(cur.history ?? []), { belt, date }].sort((a, b) =>
        a.date.localeCompare(b.date),
      );
      return { ...prev, [art]: { ...cur, history: hist } };
    });
  };
  const removeHistoryEntry = (art: Art, idx: number) => {
    setRanks((prev) => {
      const cur = prev[art];
      if (!cur?.history) return prev;
      return {
        ...prev,
        [art]: { ...cur, history: cur.history.filter((_, i) => i !== idx) },
      };
    });
  };

  return (
    <div className="mt-6 space-y-5 pb-6">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative size-20 rounded-2xl overflow-hidden border-4 border-white/5 bg-secondary group"
        >
          {avatar ? (
            <img src={avatar} alt="Avatar preview" className="size-full object-cover" />
          ) : (
            <div className="size-full flex items-center justify-center text-muted-foreground">
              <Camera className="size-6" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <Camera className="size-5 text-white" />
          </div>
        </button>
        <div className="flex-1">
          <p className="text-sm font-semibold">Profile Photo</p>
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Tap image to upload (max 3MB)</p>
          {avatar && (
            <button
              type="button"
              onClick={() => setAvatar(undefined)}
              className="mt-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground underline"
            >
              Remove
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onPickFile}
        />
      </div>

      <Field label="Name">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="profile-input"
        />
      </Field>
      <Field label="Username">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value.replace(/\s/g, "_").toLowerCase())}
          className="profile-input"
        />
      </Field>
      <Field label="Age">
        <input
          value={age}
          onChange={(e) => setAge(e.target.value.replace(/\D/g, "").slice(0, 3))}
          inputMode="numeric"
          placeholder="28"
          className="profile-input"
        />
      </Field>
      <Field label="Bio">
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          className="profile-input resize-none"
        />
      </Field>
      <div className="space-y-2">
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Skill Level</span>
        <div className="grid grid-cols-3 gap-2">
          {LEVELS.map((l) => {
            const sel = level === l;
            return (
              <button
                key={l}
                type="button"
                onClick={() => setLevel(l)}
                className={`py-2.5 rounded-lg text-xs font-bold uppercase tracking-wide border transition-colors ${
                  sel
                    ? "bg-accent text-accent-foreground border-accent"
                    : "bg-card border-border text-muted-foreground"
                }`}
              >
                {l}
              </button>
            );
          })}
        </div>
      </div>
      <div className="space-y-2">
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Disciplines</span>
        <div className="flex flex-wrap gap-2">
          {ARTS.map((a) => {
            const sel = arts.includes(a);
            return (
              <button
                key={a}
                type="button"
                onClick={() => toggleArt(a)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide border transition-colors ${
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
      </div>
      <div className="space-y-2">
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Content Preferences</span>
        <div className="flex flex-wrap gap-2">
          {CONTENT_PREFS.map((p) => {
            const sel = prefs.includes(p);
            return (
              <button
                key={p}
                type="button"
                onClick={() => togglePref(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide border transition-colors ${
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
      </div>

      {arts.length > 0 && (
        <div className="space-y-3">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
            Rank per Discipline
          </span>
          <div className="space-y-3">
            {arts.map((a) => {
              const systems = BELT_SYSTEMS[a];
              const rank = ranks[a];
              const current = rank?.value ?? "";
              const sysId = rank?.system ?? systems?.[0]?.id;
              const activeSystem = systems?.find((s) => s.id === sysId) ?? systems?.[0];
              return (
                <div key={a} className="bg-card border border-border rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wide">{a}</p>
                    <p className="text-[9px] font-mono text-muted-foreground uppercase">
                      {systems ? "Belt system" : "Years experience"}
                    </p>
                  </div>

                  {systems && systems.length > 1 && (
                    <div className="flex gap-1.5">
                      {systems.map((s) => {
                        const sel = (sysId ?? systems[0].id) === s.id;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setRankSystem(a, s.id)}
                            className={`flex-1 px-2 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wide border transition-colors ${
                              sel
                                ? "bg-primary/20 text-foreground border-primary/50"
                                : "bg-secondary border-border text-muted-foreground"
                            }`}
                          >
                            {s.label}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {activeSystem ? (
                    <>
                      <div className="flex flex-wrap gap-1.5">
                        {activeSystem.belts.map((b) => {
                          const sel = current === b;
                          return (
                            <button
                              key={b}
                              type="button"
                              onClick={() => setRankValue(a, sel ? "" : b, activeSystem.id)}
                              className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border transition-colors ${
                                sel
                                  ? "bg-accent text-accent-foreground border-accent"
                                  : "bg-secondary border-border text-muted-foreground"
                              }`}
                            >
                              {b}
                            </button>
                          );
                        })}
                      </div>
                      <BeltHistoryEditor
                        belts={activeSystem.belts}
                        history={rank?.history ?? []}
                        onAdd={(belt, date) => addHistoryEntry(a, belt, date)}
                        onRemove={(idx) => removeHistoryEntry(a, idx)}
                      />
                    </>
                  ) : (
                    <input
                      value={current}
                      onChange={(e) =>
                        setRankValue(a, e.target.value.replace(/\D/g, "").slice(0, 2))
                      }
                      inputMode="numeric"
                      placeholder="e.g. 3"
                      className="profile-input"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          onClick={onClose}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-secondary text-secondary-foreground font-bold uppercase tracking-wider text-sm active:scale-[0.98] transition-transform"
        >
          <X className="size-4" /> Cancel
        </button>
        <button
          onClick={save}
          className="flex-[2] flex items-center justify-center gap-2 py-3 rounded-2xl bg-accent text-accent-foreground font-bold uppercase tracking-wider text-sm active:scale-[0.98] transition-transform"
        >
          <Check className="size-4" /> Save Changes
        </button>
      </div>

      <style>{`
        .profile-input {
          width: 100%;
          background: color-mix(in oklch, var(--secondary) 60%, transparent);
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          padding: 0.875rem 1rem;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.2s;
          color: var(--foreground);
        }
        .profile-input:focus {
          border-color: color-mix(in oklch, var(--accent) 60%, transparent);
          box-shadow: 0 0 0 3px color-mix(in oklch, var(--accent) 20%, transparent);
        }
        .profile-input::placeholder { color: var(--muted-foreground); }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">{label}</span>
      {children}
    </label>
  );
}

function BeltHistoryEditor({
  belts,
  history,
  onAdd,
  onRemove,
}: {
  belts: string[];
  history: { belt: string; date: string }[];
  onAdd: (belt: string, date: string) => void;
  onRemove: (idx: number) => void;
}) {
  const [newBelt, setNewBelt] = useState<string>("");
  const [newDate, setNewDate] = useState<string>("");
  const [err, setErr] = useState<string>("");

  // Sorted ascending by date.
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  const usedBelts = new Set(history.map((h) => h.belt));
  const usedDates = new Set(history.map((h) => h.date));
  const last = sorted[sorted.length - 1];
  const lastBeltIdx = last ? belts.indexOf(last.belt) : -1;

  const add = () => {
    setErr("");
    if (!newBelt || !newDate) return;
    if (!belts.includes(newBelt)) {
      setErr("Belt not valid for this system.");
      return;
    }
    if (usedBelts.has(newBelt)) {
      setErr(`${newBelt} is already in the history.`);
      return;
    }
    if (usedDates.has(newDate)) {
      setErr("Another belt already uses that month/year.");
      return;
    }
    if (last && newDate <= last.date) {
      setErr(`Date must be after ${formatYearMonth(last.date)}.`);
      return;
    }
    const newIdx = belts.indexOf(newBelt);
    if (lastBeltIdx >= 0 && newIdx < lastBeltIdx) {
      setErr(`Cannot demote: current rank is ${last.belt}.`);
      return;
    }
    onAdd(newBelt, newDate);
    setNewBelt("");
    setNewDate("");
  };

  return (
    <div className="pt-2 border-t border-border space-y-2">
      <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">
        Belt history
      </p>
      {history.length > 0 && (
        <ul className="space-y-1">
          {sorted.map((h, i) => (
            <li
              key={`${h.belt}-${h.date}-${i}`}
              className="flex items-center justify-between text-[11px] bg-secondary/60 border border-border rounded-md px-2 py-1"
            >
              <span className="font-bold uppercase tracking-wide">{h.belt}</span>
              <span className="font-mono text-muted-foreground">{formatYearMonth(h.date)}</span>
              <button
                type="button"
                onClick={() => onRemove(history.findIndex((x) => x.belt === h.belt && x.date === h.date))}
                aria-label="Remove"
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-1.5">
        <select
          value={newBelt}
          onChange={(e) => setNewBelt(e.target.value)}
          className="profile-input flex-1 py-2 text-xs"
        >
          <option value="">Belt…</option>
          {belts.map((b, i) => {
            const dupBelt = usedBelts.has(b);
            const demote = lastBeltIdx >= 0 && i < lastBeltIdx;
            const disabled = dupBelt || demote;
            return (
              <option key={b} value={b} disabled={disabled}>
                {b}{dupBelt ? " (registered)" : demote ? " (lower rank)" : ""}
              </option>
            );
          })}
        </select>
        <input
          type="month"
          value={newDate}
          onChange={(e) => setNewDate(e.target.value)}
          min={last?.date}
          className="profile-input flex-1 py-2 text-xs"
        />
        <button
          type="button"
          onClick={add}
          disabled={!newBelt || !newDate}
          className="px-3 rounded-lg bg-accent text-accent-foreground disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Add belt history entry"
        >
          <Plus className="size-4" strokeWidth={2.5} />
        </button>
      </div>
      {err && <p className="text-[10px] text-destructive">{err}</p>}
    </div>
  );
}

function formatYearMonth(ym: string): string {
  // ym is YYYY-MM
  const [y, m] = ym.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const mi = Math.max(0, Math.min(11, Number(m) - 1));
  return `${months[mi]} ${y}`;
}

function SummaryCell({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-secondary/60 border border-border rounded-lg p-2">
      <p className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`text-[11px] font-bold uppercase leading-tight ${accent ? "text-accent" : ""}`}>{value}</p>
      {sub && <p className="text-[9px] font-mono text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

type RanksMap = Record<
  string,
  { type: "belt" | "years"; value: string; system?: string; history?: { belt: string; date: string }[] }
>;

function exportBeltTimelinePdf(name: string, arts: Art[], ranks: RanksMap) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  const pageW = doc.internal.pageSize.getWidth();
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("STRIVE — Belt Timeline", margin, y);
  y += 22;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(120);
  doc.text(name || "Fighter", margin, y);
  y += 24;
  doc.setTextColor(0);

  const anyHistory = arts.some((a) => (ranks[a]?.history?.length ?? 0) > 0);
  if (!anyHistory) {
    doc.text("No belt history recorded yet.", margin, y);
  } else {
    for (const a of arts) {
      const hist = ranks[a]?.history ?? [];
      if (!hist.length) continue;
      if (y > 760) { doc.addPage(); y = margin; }
      const sorted = [...hist].sort((x, z) => x.date.localeCompare(z.date));
      const first = sorted[0];
      const last = sorted[sorted.length - 1];

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(String(a).toUpperCase(), margin, y);
      y += 16;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(90);
      doc.text(
        `Current: ${last.belt} (${formatYearMonth(last.date)})   ·   First: ${first.belt} (${formatYearMonth(first.date)})   ·   Promotions: ${Math.max(0, sorted.length - 1)}`,
        margin,
        y,
      );
      y += 16;
      doc.setTextColor(0);

      doc.setFontSize(11);
      for (const h of sorted) {
        if (y > 780) { doc.addPage(); y = margin; }
        doc.text(`•  ${h.belt}`, margin + 8, y);
        doc.text(formatYearMonth(h.date), pageW - margin, y, { align: "right" });
        y += 14;
      }
      y += 12;
    }
  }

  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(
    `Generated ${new Date().toLocaleDateString()} · strive`,
    margin,
    doc.internal.pageSize.getHeight() - 24,
  );

  const safe = (name || "fighter").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  doc.save(`${safe}-belt-timeline.pdf`);
}
