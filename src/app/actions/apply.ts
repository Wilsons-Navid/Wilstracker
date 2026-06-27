"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { validateResumeFile, uploadResumeFile } from "@/lib/uploads";
import { sendApplicationReceived } from "@/lib/email";

export type ApplyState = { ok: true } | { error: string } | undefined;

/**
 * Public job application. The applicant has no session, so this runs entirely
 * through the service-role client (RLS would block an anonymous insert). It
 * creates or reuses the person, attaches the résumé, and files the application
 * under the job's owner so it lands on that recruiter's board.
 */
export async function applyToJob(
  _prev: ApplyState,
  formData: FormData,
): Promise<ApplyState> {
  const jobId = String(formData.get("job_id") ?? "").trim();
  const full_name = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const linkedin_url = String(formData.get("linkedin_url") ?? "").trim() || null;
  const resume_text = String(formData.get("cover_letter") ?? "").trim() || null;

  if (!jobId) return { error: "Missing job." };
  if (!full_name) return { error: "Your name is required." };
  if (!email) return { error: "Your email is required." };

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
  const ownerId = (job as { owner_id: string }).owner_id;
  const jobTitle = (job as { title: string }).title;

  // Find or create the person, de-duplicated by email.
  let candidateId: string;
  const { data: existing } = await admin
    .from("candidates")
    .select("id")
    .eq("email", email)
    .limit(1)
    .maybeSingle();
  if (existing) {
    candidateId = (existing as { id: string }).id;
    await admin
      .from("candidates")
      .update({ full_name, phone, linkedin_url, resume_text })
      .eq("id", candidateId);
  } else {
    const { data: created, error } = await admin
      .from("candidates")
      .insert({ full_name, email, phone, linkedin_url, resume_text })
      .select("id")
      .single();
    if (error || !created) return { error: "Could not submit your application." };
    candidateId = (created as { id: string }).id;
  }

  if (resumeFile) {
    const r = await uploadResumeFile(candidateId, resumeFile);
    if ("path" in r) {
      await admin
        .from("candidates")
        .update({ resume_url: r.path })
        .eq("id", candidateId);
    }
  }

  // One application per candidate per job.
  const { data: dupe } = await admin
    .from("applications")
    .select("id")
    .eq("candidate_id", candidateId)
    .eq("job_id", jobId)
    .maybeSingle();
  if (dupe) return { error: "You have already applied to this job." };

  const { error: appErr } = await admin.from("applications").insert({
    candidate_id: candidateId,
    job_id: jobId,
    owner_id: ownerId,
    stage: "applied",
    status: "active",
    source: "website",
  });
  if (appErr) return { error: "Could not submit your application." };

  // Best-effort confirmation; never blocks the application.
  await sendApplicationReceived(email, full_name, jobTitle);

  return { ok: true };
}
