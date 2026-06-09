import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { Lock, Flame, Award, Pencil, X, Check, Camera } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { ME, BADGES, SESSIONS, formatCount, ARTS, LEVELS, CONTENT_PREFS, BELT_SYSTEMS, hasBelts, type Art } from "@/lib/mock-data";
import { auth, useUser } from "@/lib/auth";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

export const Route = createFileRoute("/profile")({
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
  const [open, setOpen] = useState(false);

  const name = user?.name ?? ME.name;
  const username = user?.username ?? ME.username;
  const bio = user?.bio ?? ME.bio;
  const avatar = user?.avatar ?? ME.avatar;
  const arts = (user?.arts as Art[]) ?? ME.arts;
  const ranks = user?.ranks ?? {};

  const xpPct = Math.round((ME.xp / ME.xpToNext) * 100);

  return (
    <MobileShell>
      <div className="space-y-7 animate-snap-in">
        <header className="flex items-start justify-between">
          <h1 className="font-display text-4xl uppercase tracking-tight italic">Profile</h1>
          <Sheet open={open} onOpenChange={setOpen}>
            <button
              onClick={() => setOpen(true)}
              aria-label="Edit profile"
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
        </header>

        {/* Identity */}
        <section className="flex items-start gap-4">
          <img
            src={avatar}
            alt={name}
            width={80}
            height={80}
            className="size-20 rounded-2xl object-cover border-4 border-white/5"
          />
          <div className="flex-1 pt-1 space-y-1">
            <h2 className="font-display text-2xl uppercase tracking-tight leading-none">{name}</h2>
            <p className="text-xs font-mono text-muted-foreground">@{username}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-accent font-mono text-xs font-bold">LVL {ME.level}</span>
              <div className="w-28 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-accent" style={{ width: `${xpPct}%` }} />
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">{ME.xp}/{ME.xpToNext}</span>
            </div>
          </div>
        </section>

        <p className="text-sm text-foreground/80 text-pretty">{bio}</p>

        <div className="flex gap-2 flex-wrap">
          {arts.map((a) => {
            const r = ranks[a];
            const suffix = r?.value
              ? r.type === "belt"
                ? ` · ${r.value} BELT`
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

        {/* Follow stats */}
        <div className="flex items-center gap-6 text-sm">
          <div><span className="font-bold">{formatCount(ME.followers)}</span> <span className="text-muted-foreground">followers</span></div>
          <div><span className="font-bold">{formatCount(ME.following)}</span> <span className="text-muted-foreground">following</span></div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Streak" value={`${ME.streak}D`} accent />
          <Stat label="Sessions" value={String(SESSIONS.length + 121)} />
          <Stat label="XP" value={formatCount(ME.xp)} />
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
              {BADGES.filter((b) => b.earned).length}/{BADGES.length}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {BADGES.map((b) => (
              <div
                key={b.id}
                className={`aspect-square rounded-xl border flex flex-col items-center justify-center p-2 gap-1.5 text-center ${
                  b.earned
                    ? "bg-accent/10 border-accent/30"
                    : "bg-secondary/40 border-border opacity-50"
                }`}
              >
                <Award className={`size-6 ${b.earned ? "text-accent" : "text-muted-foreground"}`} />
                <p className={`text-[9px] font-mono uppercase leading-tight ${b.earned ? "text-foreground" : "text-muted-foreground"}`}>
                  {b.label}
                </p>
              </div>
            ))}
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
  const [name, setName] = useState(user?.name ?? ME.name);
  const [username, setUsername] = useState(user?.username ?? ME.username);
  const [bio, setBio] = useState(user?.bio ?? ME.bio);
  const [arts, setArts] = useState<Art[]>(((user?.arts as Art[]) ?? ME.arts));
  const [age, setAge] = useState(user?.age ?? "");
  const [level, setLevel] = useState<string>(user?.level ?? "Intermediate");
  const [prefs, setPrefs] = useState<string[]>(user?.prefs ?? []);
  const [avatar, setAvatar] = useState<string | undefined>(user?.avatar);
  const [ranks, setRanks] = useState<Record<string, { type: "belt" | "years"; value: string; system?: string }>>(
    user?.ranks ?? {},
  );
  const fileRef = useRef<HTMLInputElement>(null);

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 3 * 1024 * 1024) {
      alert("Image too large (max 3MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result as string);
    reader.readAsDataURL(f);
  };

  const save = () => {
    auth.update({
      name: name.trim(),
      username: username.trim().replace(/\s/g, "_").toLowerCase(),
      bio: bio.trim(),
      arts,
      age: age.trim(),
      level,
      prefs,
      avatar,
      ranks,
    });
    onClose();
  };

  const toggleArt = (a: Art) => {
    setArts((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
  };
  const togglePref = (p: string) => {
    setPrefs((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const setRankValue = (art: Art, value: string, system?: string) => {
    setRanks((prev) => ({
      ...prev,
      [art]: { type: hasBelts(art) ? "belt" : "years", value, system },
    }));
  };
  const setRankSystem = (art: Art, system: string) => {
    setRanks((prev) => ({
      ...prev,
      [art]: { type: "belt", value: "", system },
    }));
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
