"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/dal";
import type { CandidateStage } from "@/lib/types";
import { STAGES } from "@/lib/types";
import {
  uploadAvatarFile,
  uploadResumeFile,
  validateAvatarFile,
  validateResumeFile,
} from "@/lib/uploads";

export type CandidateFormState = { ok: true } | { error: string } | undefined;

export async function createCandidate(
  _prev: CandidateFormState,
  formData: FormData,
): Promise<CandidateFormState> {
  const me = await getProfile();
  if (!me) return { error: "Not authenticated." };

  const full_name = String(formData.get("full_name") ?? "").trim();
  const job_id = String(formData.get("job_id") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim() || null;
  const linkedin_url = String(formData.get("linkedin_url") ?? "").trim() || null;
  const resume_text = String(formData.get("resume_text") ?? "").trim() || null;
  const stage = (String(formData.get("stage") ?? "applied") as CandidateStage);

  if (!full_name) return { error: "Candidate name is required." };
  if (!job_id) return { error: "Please choose a job." };
  if (!STAGES.includes(stage)) return { error: "Invalid stage." };

  // Optional file inputs. Validate them BEFORE inserting, so a bad file is
  // rejected cleanly instead of leaving a half-created candidate behind.
  const avatarInput = formData.get("avatar");
  const resumeInput = formData.get("resume_file");
  const avatarFile =
    avatarInput instanceof File && avatarInput.size > 0 ? avatarInput : null;
  const resumeFile =
    resumeInput instanceof File && resumeInput.size > 0 ? resumeInput : null;
  if (avatarFile) {
    const invalid = validateAvatarFile(avatarFile);
    if (invalid) return { error: invalid };
  }
  if (resumeFile) {
    const invalid = validateResumeFile(resumeFile);
    if (invalid) return { error: invalid };
  }

  const supabase = await createClient();

  // Candidate ownership follows the job's owner — this is how an admin adds
  // candidates on a customer's behalf without a separate owner picker.
  const { data: job, error: jobErr } = await supabase
    .from("jobs")
    .select("owner_id")
    .eq("id", job_id)
    .single();
  if (jobErr || !job) return { error: "Job not found or not accessible." };

  const { data: created, error } = await supabase
    .from("candidates")
    .insert({
      owner_id: job.owner_id,
      job_id,
      full_name,
      email,
      linkedin_url,
      resume_text,
      stage,
    })
    .select("id")
    .single();
  if (error || !created) {
    return { error: error?.message ?? "Could not create the candidate." };
  }
  const candidateId = (created as { id: string }).id;

  // Files are keyed by candidate ID, so they upload after the row exists.
  // A rare upload failure won't block creation — the file can be added later
  // from the candidate page.
  const updates: { avatar_url?: string; resume_url?: string } = {};
  if (avatarFile) {
    const r = await uploadAvatarFile(candidateId, avatarFile);
    if ("url" in r) updates.avatar_url = r.url;
  }
  if (resumeFile) {
    const r = await uploadResumeFile(candidateId, resumeFile);
    if ("path" in r) updates.resume_url = r.path;
  }
  if (updates.avatar_url || updates.resume_url) {
    await supabase.from("candidates").update(updates).eq("id", candidateId);
  }

  revalidatePath("/");
  redirect("/");
}

export async function updateCandidate(
  _prev: CandidateFormState,
  formData: FormData,
): Promise<CandidateFormState> {
  const me = await getProfile();
  if (!me) return { error: "Not authenticated." };

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Missing candidate id." };

  const full_name = String(formData.get("full_name") ?? "").trim();
  const stage = String(formData.get("stage") ?? "applied") as CandidateStage;
  if (!full_name) return { error: "Candidate name is required." };
  if (!STAGES.includes(stage)) return { error: "Invalid stage." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("candidates")
    .update({
      full_name,
      email: String(formData.get("email") ?? "").trim() || null,
      linkedin_url: String(formData.get("linkedin_url") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
      resume_text: String(formData.get("resume_text") ?? "").trim() || null,
      stage,
    })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath(`/candidates/${id}`);
  return { ok: true };
}

export async function deleteCandidate(id: string): Promise<void> {
  const me = await getProfile();
  if (!me) return;
  const supabase = await createClient();
  await supabase.from("candidates").delete().eq("id", id);
  revalidatePath("/");
  redirect("/");
}

export async function moveCandidateStage(
  candidateId: string,
  stage: CandidateStage,
): Promise<{ error?: string }> {
  // Auth check — Server Actions are public endpoints.
  const profile = await getProfile();
  if (!profile) return { error: "Not authenticated." };
  if (!STAGES.includes(stage)) return { error: "Invalid stage." };

  const supabase = await createClient();
  // RLS guarantees a customer can only move their own candidates.
  const { error } = await supabase
    .from("candidates")
    .update({ stage })
    .eq("id", candidateId);

  if (error) return { error: error.message };

  revalidatePath("/");
  return {};
}
