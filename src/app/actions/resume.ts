"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/dal";
import { uploadResumeFile } from "@/lib/uploads";

const BUCKET = "resumes";

export type ResumeState = { ok: true } | { error: string };

/** Confirms the signed-in user may touch this candidate (RLS does the real check). */
async function assertCandidateAccess(
  candidateId: string,
): Promise<{ error: string } | { resume_url: string | null }> {
  const me = await getProfile();
  if (!me) return { error: "Not authenticated." };

  // Query through the user-scoped client so RLS enforces ownership/admin rules.
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("candidates")
    .select("id, resume_url")
    .eq("id", candidateId)
    .single();

  if (error || !data) return { error: "Candidate not found." };
  return { resume_url: (data as { resume_url: string | null }).resume_url };
}

export async function uploadResume(
  candidateId: string,
  formData: FormData,
): Promise<ResumeState> {
  const access = await assertCandidateAccess(candidateId);
  if ("error" in access) return access;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose a file." };
  }

  const uploaded = await uploadResumeFile(candidateId, file);
  if ("error" in uploaded) return uploaded;

  const admin = createAdminClient();
  // Point the candidate at the new file, then clean up any previous one.
  const { error: dbErr } = await admin
    .from("candidates")
    .update({ resume_url: uploaded.path })
    .eq("id", candidateId);
  if (dbErr) {
    await admin.storage.from(BUCKET).remove([uploaded.path]); // don't orphan
    return { error: dbErr.message };
  }

  if (access.resume_url && access.resume_url !== uploaded.path) {
    await admin.storage.from(BUCKET).remove([access.resume_url]);
  }

  revalidatePath(`/candidates/${candidateId}`);
  return { ok: true };
}

export async function removeResume(candidateId: string): Promise<ResumeState> {
  const access = await assertCandidateAccess(candidateId);
  if ("error" in access) return access;

  const admin = createAdminClient();
  if (access.resume_url) {
    await admin.storage.from(BUCKET).remove([access.resume_url]);
  }
  const { error } = await admin
    .from("candidates")
    .update({ resume_url: null })
    .eq("id", candidateId);
  if (error) return { error: error.message };

  revalidatePath(`/candidates/${candidateId}`);
  return { ok: true };
}

/**
 * Short-lived signed URL so a private résumé can be viewed/downloaded.
 * Takes a candidateId (never a caller-supplied path): assertCandidateAccess
 * resolves resume_url through the user-scoped RLS client, so a caller can only
 * ever sign the file for a candidate they're actually allowed to see.
 */
export async function getResumeSignedUrl(
  candidateId: string,
): Promise<string | null> {
  const access = await assertCandidateAccess(candidateId);
  if ("error" in access || !access.resume_url) return null;

  const admin = createAdminClient();
  const { data } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(access.resume_url, 60 * 10); // 10 minutes
  return data?.signedUrl ?? null;
}
