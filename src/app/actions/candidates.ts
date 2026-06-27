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
  const stage = String(formData.get("stage") ?? "applied") as CandidateStage;

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

  // The application's owner follows the job's owner — this is how an admin adds
  // candidates on a customer's behalf without a separate owner picker.
  const { data: job, error: jobErr } = await supabase
    .from("jobs")
    .select("owner_id")
    .eq("id", job_id)
    .single();
  if (jobErr || !job) return { error: "Job not found or not accessible." };

  // 1. The person.
  const { data: created, error } = await supabase
    .from("candidates")
    .insert({ full_name, email, linkedin_url, resume_text })
    .select("id")
    .single();
  if (error || !created) {
    return { error: error?.message ?? "Could not create the candidate." };
  }
  const candidateId = (created as { id: string }).id;

  // 2. Files are keyed by candidate ID, so they upload after the row exists.
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

  // 3. The pipeline entry that lands on the board.
  const { error: appErr } = await supabase.from("applications").insert({
    candidate_id: candidateId,
    job_id,
    owner_id: (job as { owner_id: string }).owner_id,
    stage,
    source: "recruiter",
  });
  if (appErr) return { error: appErr.message };

  revalidatePath("/");
  redirect("/");
}

export async function updateCandidate(
  _prev: CandidateFormState,
  formData: FormData,
): Promise<CandidateFormState> {
  const me = await getProfile();
  if (!me) return { error: "Not authenticated." };

  const applicationId = String(formData.get("application_id") ?? "").trim();
  const candidateId = String(formData.get("candidate_id") ?? "").trim();
  if (!applicationId || !candidateId) return { error: "Missing identifiers." };

  const full_name = String(formData.get("full_name") ?? "").trim();
  const stage = String(formData.get("stage") ?? "applied") as CandidateStage;
  if (!full_name) return { error: "Candidate name is required." };
  if (!STAGES.includes(stage)) return { error: "Invalid stage." };

  const supabase = await createClient();

  // Person fields live on the candidate.
  const { error: cErr } = await supabase
    .from("candidates")
    .update({
      full_name,
      email: String(formData.get("email") ?? "").trim() || null,
      linkedin_url: String(formData.get("linkedin_url") ?? "").trim() || null,
      resume_text: String(formData.get("resume_text") ?? "").trim() || null,
    })
    .eq("id", candidateId);
  if (cErr) return { error: cErr.message };

  // Pipeline fields live on the application.
  const { error: aErr } = await supabase
    .from("applications")
    .update({ stage, notes: String(formData.get("notes") ?? "").trim() || null })
    .eq("id", applicationId);
  if (aErr) return { error: aErr.message };

  revalidatePath("/");
  revalidatePath(`/candidates/${applicationId}`);
  return { ok: true };
}

export async function deleteCandidate(applicationId: string): Promise<void> {
  const me = await getProfile();
  if (!me) return;
  const supabase = await createClient();

  // Load the application's candidate so we can decide whether to remove the
  // person too. Keep the person if they have an account or other applications.
  const { data: app } = await supabase
    .from("applications")
    .select("candidate_id")
    .eq("id", applicationId)
    .single();

  if (app) {
    const candidateId = (app as { candidate_id: string }).candidate_id;
    const { data: cand } = await supabase
      .from("candidates")
      .select("auth_user_id")
      .eq("id", candidateId)
      .single();
    const { count } = await supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("candidate_id", candidateId);

    const hasAccount = !!(cand as { auth_user_id: string | null } | null)
      ?.auth_user_id;
    if (!hasAccount && (count ?? 0) <= 1) {
      // Recruiter-created, single application: remove the person (cascades the app).
      await supabase.from("candidates").delete().eq("id", candidateId);
    } else {
      await supabase.from("applications").delete().eq("id", applicationId);
    }
  }

  revalidatePath("/");
  redirect("/");
}

export async function moveCandidateStage(
  applicationId: string,
  stage: CandidateStage,
): Promise<{ error?: string }> {
  // Auth check — Server Actions are public endpoints.
  const profile = await getProfile();
  if (!profile) return { error: "Not authenticated." };
  if (!STAGES.includes(stage)) return { error: "Invalid stage." };

  const supabase = await createClient();
  // RLS guarantees a customer can only move applications they own.
  // The stage_history row is written by a database trigger.
  const { error } = await supabase
    .from("applications")
    .update({ stage })
    .eq("id", applicationId);

  if (error) return { error: error.message };

  revalidatePath("/");
  return {};
}
