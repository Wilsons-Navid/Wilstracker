"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { validateResumeFile, uploadResumeFile } from "@/lib/uploads";
import { sendApplicationReceived } from "@/lib/email";

export type ApplyState = { ok: true } | { error: string } | undefined;

// This is an unauthenticated, service-role endpoint, so every input is hostile
// until proven otherwise. Cap field lengths to keep storage bounded and reject
// malformed contact details before anything touches the database.
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const MAX = { name: 120, email: 200, phone: 40, url: 300, cover: 5000 };

function tooLong(v: string | null, max: number): boolean {
  return !!v && v.length > max;
}

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
  if (!EMAIL_RE.test(email)) return { error: "Enter a valid email address." };
  if (
    tooLong(full_name, MAX.name) ||
    tooLong(email, MAX.email) ||
    tooLong(phone, MAX.phone) ||
    tooLong(linkedin_url, MAX.url) ||
    tooLong(resume_text, MAX.cover)
  ) {
    return { error: "One of the fields is too long." };
  }

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
  //
  // SECURITY: this endpoint is anonymous, so we must NOT overwrite an existing
  // candidate's details — anyone could submit with someone else's email and
  // clobber their name, contact info, or résumé (worse still if they have an
  // account). For an existing person we only file a new application; their
  // profile is left untouched. A brand-new person is created from the form.
  let candidateId: string;
  let isNewPerson = false;
  const { data: existing } = await admin
    .from("candidates")
    .select("id")
    .eq("email", email)
    .limit(1)
    .maybeSingle();
  if (existing) {
    candidateId = (existing as { id: string }).id;
  } else {
    const { data: created, error } = await admin
      .from("candidates")
      .insert({ full_name, email, phone, linkedin_url, resume_text })
      .select("id")
      .single();
    if (error || !created) return { error: "Could not submit your application." };
    candidateId = (created as { id: string }).id;
    isNewPerson = true;
  }

  // Lightweight rate limit: block a burst of applications from the same person.
  // The per-job dedupe below stops same-job spam; this caps rapid cross-job
  // submissions (e.g. a script hitting every opening at once).
  const sinceIso = new Date(Date.now() - 60_000).toISOString();
  const { count: recent } = await admin
    .from("applications")
    .select("id", { count: "exact", head: true })
    .eq("candidate_id", candidateId)
    .gte("created_at", sinceIso);
  if ((recent ?? 0) >= 5) {
    return { error: "Too many applications in a short time. Please try again shortly." };
  }

  // Only attach the résumé for a newly created person. Never overwrite an
  // existing candidate's stored résumé from an anonymous submission.
  if (resumeFile && isNewPerson) {
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
