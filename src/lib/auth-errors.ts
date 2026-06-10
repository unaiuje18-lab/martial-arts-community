import type { TKey } from "@/lib/i18n";

// Map opaque Supabase auth error strings/codes to our translation keys.
export function authErrorKey(err: unknown): TKey {
  const raw =
    err && typeof err === "object" && "message" in err
      ? String((err as { message: unknown }).message ?? "")
      : String(err ?? "");
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code: unknown }).code ?? "")
      : "";
  const m = `${code} ${raw}`.toLowerCase();

  if (m.includes("invalid login") || m.includes("invalid_credentials")) return "auth.invalidCreds";
  if (m.includes("email not confirmed") || m.includes("email_not_confirmed")) return "auth.notConfirmed";
  if (m.includes("user already registered") || m.includes("already registered") || m.includes("user_already_exists"))
    return "auth.userExists";
  if (m.includes("pwned") || m.includes("compromised") || m.includes("breach"))
    return "auth.compromised";
  if (m.includes("password should be") || m.includes("weak password") || m.includes("weak_password"))
    return "auth.weakPassword";
  if (m.includes("cancel") || m.includes("popup") || m.includes("closed by user"))
    return "auth.googleCanceled";
  return "auth.unknown";
}