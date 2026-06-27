"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error: string } | undefined;

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

  // Route by role: candidates land in their portal, staff on the board.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id ?? "")
    .single();
  redirect((profile as { role: string } | null)?.role === "candidate" ? "/portal" : "/");
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

  const supabase = await createClient();
  // role=candidate in metadata drives the handle_new_user trigger, which creates
  // the profile and the linked candidate row.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name, role: "candidate" } },
  });
  if (error) return { error: error.message };

  // If the project requires email confirmation there is no session yet.
  if (!data.session) return { ok: true };
  redirect("/portal");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
