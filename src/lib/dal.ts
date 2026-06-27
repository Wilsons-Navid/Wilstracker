import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Candidate, Profile } from "@/lib/types";

/**
 * Data Access Layer — centralizes the "who is the current user" check.
 * `cache` memoizes within a single request/render pass.
 */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (data as Profile) ?? null;
});

export async function requireProfile(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  return profile;
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.role !== "admin") redirect("/board");
  return profile;
}

// Staff (recruiter/admin) only — candidates are bounced to their portal.
export async function requireStaff(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.role === "candidate") redirect("/portal");
  return profile;
}

// The candidate row (the person) linked to the signed-in account.
export const getCandidate = cache(async (): Promise<Candidate | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("candidates")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();

  return (data as Candidate) ?? null;
});

export async function requireCandidate(): Promise<Candidate> {
  const profile = await requireProfile();
  if (profile.role !== "candidate") redirect("/board");
  const candidate = await getCandidate();
  if (!candidate) redirect("/login");
  return candidate;
}
