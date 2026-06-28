"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateResumeFile, uploadResumeFile } from "@/lib/uploads";

export type ProfileState = { ok: true } | { error: string } | undefined;

/**
 * A candidate edits their own profile. The candidate row is resolved from the
 * session (auth_user_id), never from a caller-supplied id, so a candidate can
 * only ever modify their own record. RLS enforces the same on the update.
 */
export async function updateCandidateProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data: cand } = await supabase
    .from("candidates")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();
  if (!cand) return { error: "Profile not found." };
  const candidateId = (cand as { id: string }).id;

  const full_name = String(formData.get("full_name") ?? "").trim();
  if (!full_name) return { error: "Your name is required." };

  const resumeInput = formData.get("resume_file");
  const resumeFile =
    resumeInput instanceof File && resumeInput.size > 0 ? resumeInput : null;
  if (resumeFile) {
    const invalid = validateResumeFile(resumeFile);
    if (invalid) return { error: invalid };
  }

  const { error } = await supabase
    .from("candidates")
    .update({
      full_name,
      email: String(formData.get("email") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      linkedin_url: String(formData.get("linkedin_url") ?? "").trim() || null,
      portfolio_url: String(formData.get("portfolio_url") ?? "").trim() || null,
      location: String(formData.get("location") ?? "").trim() || null,
      headline: String(formData.get("headline") ?? "").trim() || null,
    })
    .eq("id", candidateId);
  if (error) return { error: error.message };

  if (resumeFile) {
    const r = await uploadResumeFile(candidateId, resumeFile);
    if ("error" in r) return { error: r.error };
    // resume_url is set with the admin client (storage path), then the row is
    // updated through the user client so RLS still applies.
    await createAdminClient()
      .from("candidates")
      .update({ resume_url: r.path })
      .eq("id", candidateId);
  }

  revalidatePath("/portal/profile");
  return { ok: true };
}
