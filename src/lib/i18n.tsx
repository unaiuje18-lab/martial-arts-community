import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "es";

const dict = {
  en: {
    "nav.home": "Home",
    "nav.search": "Search",
    "nav.create": "Create",
    "nav.duels": "Duels",
    "nav.profile": "Profile",
    "auth.signinTitle": "Sign in to train, post and compete.",
    "auth.signupTitle": "Create your fighter profile.",
    "auth.continueGoogle": "Continue with Google",
    "auth.or": "or",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.signIn": "Sign in",
    "auth.create": "Create account",
    "auth.newHere": "New here?",
    "auth.createOne": "Create an account",
    "auth.haveAccount": "Already have an account?",
    "auth.backFeed": "← Back to feed",
    "onb.step": "Step",
    "onb.identity": "Identity",
    "onb.disciplines": "Disciplines",
    "onb.skill": "Skill",
    "onb.interests": "Interests",
    "onb.name": "Name",
    "onb.username": "Username",
    "onb.birthday": "Birthday",
    "onb.ageAuto": "Age (auto)",
    "onb.continue": "Continue",
    "onb.enter": "Enter STRIVE",
    "profile.title": "Profile",
    "profile.edit": "Edit profile",
    "profile.signOut": "Sign out",
    "profile.language": "Language",
    "profile.bioPlaceholder": "Add a bio from Edit profile.",
    "profile.streak": "Streak",
    "profile.sessions": "Sessions",
    "profile.xp": "XP",
    "profile.followers": "followers",
    "profile.following": "following",
    "profile.tracker": "Private Training Tracker",
    "profile.trackerHint": "Only visible to you",
    "profile.open": "OPEN",
    "profile.badges": "Badges",
  },
  es: {
    "nav.home": "Inicio",
    "nav.search": "Buscar",
    "nav.create": "Crear",
    "nav.duels": "Duelos",
    "nav.profile": "Perfil",
    "auth.signinTitle": "Inicia sesión para entrenar, publicar y competir.",
    "auth.signupTitle": "Crea tu perfil de luchador.",
    "auth.continueGoogle": "Continuar con Google",
    "auth.or": "o",
    "auth.email": "Correo",
    "auth.password": "Contraseña",
    "auth.signIn": "Iniciar sesión",
    "auth.create": "Crear cuenta",
    "auth.newHere": "¿Nuevo aquí?",
    "auth.createOne": "Crea una cuenta",
    "auth.haveAccount": "¿Ya tienes cuenta?",
    "auth.backFeed": "← Volver al feed",
    "onb.step": "Paso",
    "onb.identity": "Identidad",
    "onb.disciplines": "Disciplinas",
    "onb.skill": "Nivel",
    "onb.interests": "Intereses",
    "onb.name": "Nombre",
    "onb.username": "Usuario",
    "onb.birthday": "Cumpleaños",
    "onb.ageAuto": "Edad (auto)",
    "onb.continue": "Continuar",
    "onb.enter": "Entrar a STRIVE",
    "profile.title": "Perfil",
    "profile.edit": "Editar perfil",
    "profile.signOut": "Cerrar sesión",
    "profile.language": "Idioma",
    "profile.bioPlaceholder": "Añade una bio desde Editar perfil.",
    "profile.streak": "Racha",
    "profile.sessions": "Sesiones",
    "profile.xp": "XP",
    "profile.followers": "seguidores",
    "profile.following": "siguiendo",
    "profile.tracker": "Tracker Privado",
    "profile.trackerHint": "Solo visible para ti",
    "profile.open": "ABRIR",
    "profile.badges": "Insignias",
  },
} as const;

export type TKey = keyof (typeof dict)["en"];

const KEY = "strive-lang";

function readLang(): Lang {
  if (typeof window === "undefined") return "en";
  const v = localStorage.getItem(KEY);
  if (v === "en" || v === "es") return v;
  const nav = navigator.language?.toLowerCase() ?? "";
  return nav.startsWith("es") ? "es" : "en";
}

const I18nCtx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: TKey) => string }>(
  { lang: "en", setLang: () => {}, t: (k) => dict.en[k] },
);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    setLangState(readLang());
  }, []);
  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {
      /* ignore */
    }
  };
  const t = (k: TKey) => dict[lang][k] ?? dict.en[k] ?? k;
  return <I18nCtx.Provider value={{ lang, setLang, t }}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  return useContext(I18nCtx);
}

export function useT() {
  return useContext(I18nCtx).t;
}