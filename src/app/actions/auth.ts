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

  redirect("/");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
