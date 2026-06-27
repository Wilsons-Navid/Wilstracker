"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCandidate } from "@/lib/dal";
import { validateResumeFile, uploadResumeFile } from "@/lib/uploads";
import { sendApplicationReceived } from "@/lib/email";

export type ApplyState = { ok: true } | { error: string } | undefined;

const MAX_NOTE = 5000;

/**
 * Apply to a job as the signed-in candidate.
 *
 * Applying requires an account, so identity comes from the session (not a form
 * field) — there's no email to spoof and no chance of overwriting someone else's
 * profile. We file the application under the job's owner so it lands on that
 * recruiter's board, attaching the candidate's existing profile and résumé.
 */
export async function applyToJobAsCandidate(
  _prev: ApplyState,
  formData: FormData,
): Promise<ApplyState> {
  const jobId = String(formData.get("job_id") ?? "").trim();
  if (!jobId) return { error: "Missing job." };

  // Redirects to /login (or /board for staff) if there's no candidate session.
  const candidate = await requireCandidate();

  const note = String(formData.get("cover_letter") ?? "").trim() || null;
  if (note && note.length > MAX_NOTE) return { error: "Your note is too long." };

  const resumeInput = formData.get("resume_file");
  const resumeFile =
    resumeInput instanceof File && resumeInput.size > 0 ? resumeInput : null;
  if (resumeFile) {
    const invalid = validateResumeFile(resumeFile);
    if (invalid) return { error: invalid };
  }

  const admin = createAdminClient();

  // The job must exist and still be open.
  const { data: job } = await admin
    .from("jobs")
    .select("id, owner_id, status, title")
    .eq("id", jobId)
    .single();
  if (!job || (job as { status: string }).status !== "open") {
    return { error: "This job is no longer accepting applications." };
  }

  // One application per candidate per job.
  const { data: dupe } = await admin
    .from("applications")
    .select("id")
    .eq("candidate_id", candidate.id)
    .eq("job_id", jobId)
    .maybeSingle();
  if (dupe) return { error: "You have already applied to this job." };

  // Attach an uploaded résumé only if the candidate has none on file; never
  // clobber a résumé they already manage from their profile.
  if (resumeFile && !candidate.resume_url) {
    const r = await uploadResumeFile(candidate.id, resumeFile);
    if ("path" in r) {
      await admin
        .from("candidates")
        .update({ resume_url: r.path })
        .eq("id", candidate.id);
    }
  }

  const { error: appErr } = await admin.from("applications").insert({
    candidate_id: candidate.id,
    job_id: jobId,
    owner_id: (job as { owner_id: string }).owner_id,
    stage: "applied",
    status: "active",
    source: "website",
    notes: note,
  });
  if (appErr) return { error: "Could not submit your application." };

  // Best-effort confirmation; never blocks the application.
  if (candidate.email) {
    await sendApplicationReceived(
      candidate.email,
      candidate.full_name,
      (job as { title: string }).title,
    );
  }

  revalidatePath("/portal");
  return { ok: true };
}
