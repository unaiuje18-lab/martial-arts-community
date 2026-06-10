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
    "auth.forgot": "Forgot password?",
    "auth.sendReset": "Send reset link",
    "auth.resetSent": "Check your email for the reset link.",
    "auth.checkEmail": "Confirm your email",
    "auth.checkEmailBody": "We sent a confirmation link to {email}. Click it to finish creating your account.",
    "auth.resend": "Resend confirmation email",
    "auth.resent": "Confirmation email re-sent.",
    "auth.googleCanceled": "Google sign-in was cancelled.",
    "auth.invalidCreds": "Wrong email or password.",
    "auth.weakPassword": "Password is too weak — use 8+ chars with a mix of letters and numbers.",
    "auth.compromised": "This password has been seen in a data breach. Pick a different one.",
    "auth.userExists": "An account with that email already exists.",
    "auth.notConfirmed": "Please confirm your email before signing in.",
    "auth.unknown": "Something went wrong. Try again in a moment.",
    "auth.back": "← Back",
    "reset.title": "Set a new password",
    "reset.body": "Enter a new password for your account.",
    "reset.new": "New password",
    "reset.confirm": "Confirm password",
    "reset.update": "Update password",
    "reset.mismatch": "Passwords don't match.",
    "reset.success": "Password updated. You're signed in.",
    "reset.invalidLink": "This reset link is invalid or expired. Request a new one.",
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
    "profile.account": "Account",
    "profile.changePassword": "Change password",
    "profile.passwordUpdated": "Password updated.",
    "profile.saving": "Saving…",
    "profile.saved": "Profile saved.",
    "profile.saveError": "Could not save your profile.",
    "profile.uploadingAvatar": "Uploading photo…",
    "profile.avatarError": "Could not upload photo.",
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
    "auth.forgot": "¿Olvidaste tu contraseña?",
    "auth.sendReset": "Enviar enlace",
    "auth.resetSent": "Revisa tu correo para el enlace de restablecimiento.",
    "auth.checkEmail": "Confirma tu correo",
    "auth.checkEmailBody": "Te enviamos un enlace de confirmación a {email}. Haz clic para terminar de crear tu cuenta.",
    "auth.resend": "Reenviar correo de confirmación",
    "auth.resent": "Correo de confirmación reenviado.",
    "auth.googleCanceled": "Cancelaste el inicio con Google.",
    "auth.invalidCreds": "Correo o contraseña incorrectos.",
    "auth.weakPassword": "La contraseña es muy débil — usa 8+ caracteres con letras y números.",
    "auth.compromised": "Esta contraseña apareció en una filtración. Usa otra distinta.",
    "auth.userExists": "Ya existe una cuenta con ese correo.",
    "auth.notConfirmed": "Confirma tu correo antes de iniciar sesión.",
    "auth.unknown": "Algo salió mal. Inténtalo de nuevo.",
    "auth.back": "← Volver",
    "reset.title": "Nueva contraseña",
    "reset.body": "Introduce una nueva contraseña para tu cuenta.",
    "reset.new": "Nueva contraseña",
    "reset.confirm": "Confirmar contraseña",
    "reset.update": "Actualizar contraseña",
    "reset.mismatch": "Las contraseñas no coinciden.",
    "reset.success": "Contraseña actualizada. Sesión iniciada.",
    "reset.invalidLink": "Este enlace ha expirado o no es válido. Solicita otro.",
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
    "profile.account": "Cuenta",
    "profile.changePassword": "Cambiar contraseña",
    "profile.passwordUpdated": "Contraseña actualizada.",
    "profile.saving": "Guardando…",
    "profile.saved": "Perfil guardado.",
    "profile.saveError": "No se pudo guardar el perfil.",
    "profile.uploadingAvatar": "Subiendo foto…",
    "profile.avatarError": "No se pudo subir la foto.",
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