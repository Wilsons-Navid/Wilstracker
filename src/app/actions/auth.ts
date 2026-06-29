"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error: string } | undefined;

// Only allow redirecting to a path on this site. Reject absolute URLs and
// protocol-relative paths ("//evil.com") so `next` can't become an open redirect.
function safeNext(value: FormDataEntryValue | null): string | null {
  const next = typeof value === "string" ? value : "";
  if (next.startsWith("/") && !next.startsWith("//")) return next;
  return null;
}

export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Distinguish a genuine bad-credentials response (HTTP 400 from GoTrue) from
    // system/config failures (network, missing env, project down). Collapsing
    // everything into "invalid password" previously hid a blank-env-var bug.
    const status = (error as { status?: number }).status;
    const isBadCredentials =
      status === 400 || /invalid login credentials/i.test(error.message);

    if (isBadCredentials) {
      return { error: "Invalid email or password." };
    }

    console.error("[auth] signIn system error:", status, error.message);
    return {
      error: "Sign-in is temporarily unavailable. Please try again shortly.",
    };
  }

  // Honor an explicit return path (e.g. an applicant sent to sign in from a job),
  // otherwise route by role: candidates to their portal, staff to the board.
  const next = safeNext(formData.get("next"));
  if (next) redirect(next);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id ?? "")
    .single();
  redirect(
    (profile as { role: string } | null)?.role === "candidate" ? "/portal" : "/board",
  );
}

export type SignUpState = { ok: true } | { error: string } | undefined;

export async function signUpCandidate(
  _prev: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
  const full_name = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!full_name) return { error: "Your name is required." };
  if (!email || !password) return { error: "Email and password are required." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  // Build the confirmation-link target from the incoming request so it points at
  // this deployment (localhost in dev, the live URL in prod) instead of whatever
  // Supabase's Site URL happens to be.
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const origin = h.get("origin") ?? (host ? `${proto}://${host}` : "");

  const supabase = await createClient();
  // role=candidate in metadata drives the handle_new_user trigger, which creates
  // the profile and the linked candidate row.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name, role: "candidate" },
      emailRedirectTo: origin ? `${origin}/auth/callback` : undefined,
    },
  });
  if (error) return { error: error.message };

  // If the project requires email confirmation there is no session yet.
  if (!data.session) return { ok: true };

  // Account is active — send them back where they came from (e.g. the job they
  // were trying to apply to) or to their portal.
  const next = safeNext(formData.get("next"));
  redirect(next ?? "/portal");
}

export type ResetRequestState = { ok: true } | { error: string } | undefined;

// Public "forgot password" — sends a recovery email. Works for any account
// (customer or candidate). Always reports success so the form never reveals
// whether an email is registered.
export async function requestPasswordReset(
  _prev: ResetRequestState,
  formData: FormData,
): Promise<ResetRequestState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email) return { error: "Enter your email address." };

  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const origin = h.get("origin") ?? (host ? `${proto}://${host}` : "");

  const supabase = await createClient();
  // The recovery link returns through /auth/callback (which exchanges the code
  // for a session) and is then forwarded to /reset-password to set a new one.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: origin
      ? `${origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`
      : undefined,
  });
  return { ok: true };
}

// Sets a new password for the user landed here via a recovery link (the callback
// established a recovery session first).
export async function updatePassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirm) {
    return { error: "Passwords do not match." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your reset link is invalid or has expired. Request a new one." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  redirect(
    (profile as { role: string } | null)?.role === "candidate" ? "/portal" : "/board",
  );
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
