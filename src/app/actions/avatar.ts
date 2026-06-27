"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/dal";
import { uploadAvatarFile } from "@/lib/uploads";

const BUCKET = "avatars";

export type AvatarState = { ok: true } | { error: string };

/** Confirms the signed-in user may touch this candidate (RLS does the real check). */
async function assertCandidateAccess(
  candidateId: string,
): Promise<{ error: string } | { ok: true }> {
  const me = await getProfile();
  if (!me) return { error: "Not authenticated." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("candidates")
    .select("id")
    .eq("id", candidateId)
    .single();

  if (error || !data) return { error: "Candidate not found." };
  return { ok: true };
}

export async function uploadAvatar(
  candidateId: string,
  formData: FormData,
): Promise<AvatarState> {
  const access = await assertCandidateAccess(candidateId);
  if ("error" in access) return access;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose an image." };
  }

  const uploaded = await uploadAvatarFile(candidateId, file);
  if ("error" in uploaded) return uploaded;

  const { error: dbErr } = await createAdminClient()
    .from("candidates")
    .update({ avatar_url: uploaded.url })
    .eq("id", candidateId);
  if (dbErr) return { error: dbErr.message };

  revalidatePath(`/candidates/${candidateId}`);
  revalidatePath("/");
  return { ok: true };
}

export async function removeAvatar(candidateId: string): Promise<AvatarState> {
  const access = await assertCandidateAccess(candidateId);
  if ("error" in access) return access;

  const admin = createAdminClient();
  const { data: existing } = await admin.storage.from(BUCKET).list(candidateId);
  if (existing?.length) {
    await admin.storage
      .from(BUCKET)
      .remove(existing.map((f) => `${candidateId}/${f.name}`));
  }

  const { error } = await admin
    .from("candidates")
    .update({ avatar_url: null })
    .eq("id", candidateId);
  if (error) return { error: error.message };

  revalidatePath(`/candidates/${candidateId}`);
  revalidatePath("/");
  return { ok: true };
}
