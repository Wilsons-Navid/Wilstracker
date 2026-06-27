import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Shared candidate file-upload helpers. Used by the create flow
 * (`createCandidate`) and the detail-page panels (`uploadResume`/`uploadAvatar`).
 * These run with the service-role client; callers must do their own auth check.
 */

const RESUME_BUCKET = "resumes";
const AVATAR_BUCKET = "avatars";

const RESUME_MAX = 5 * 1024 * 1024; // 5MB
const AVATAR_MAX = 2 * 1024 * 1024; // 2MB

const RESUME_EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
};
const AVATAR_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function validateResumeFile(file: File): string | null {
  if (file.size > RESUME_MAX) return "Résumé file is too large (max 5MB).";
  if (!RESUME_EXT[file.type]) return "Résumé must be a PDF, DOC, or DOCX.";
  return null;
}

export function validateAvatarFile(file: File): string | null {
  if (file.size > AVATAR_MAX) return "Photo is too large (max 2MB).";
  if (!AVATAR_EXT[file.type]) return "Photo must be a PNG, JPG, WEBP, or GIF.";
  return null;
}

/** Uploads a résumé to the private bucket. Returns the storage path. */
export async function uploadResumeFile(
  candidateId: string,
  file: File,
): Promise<{ path: string } | { error: string }> {
  const invalid = validateResumeFile(file);
  if (invalid) return { error: invalid };

  const admin = createAdminClient();
  const path = `${candidateId}/${Date.now()}.${RESUME_EXT[file.type]}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const { error } = await admin.storage
    .from(RESUME_BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: true });
  if (error) return { error: `Résumé upload failed: ${error.message}` };
  return { path };
}

/** Uploads a photo to the public bucket, replacing any existing one. Returns the public URL. */
export async function uploadAvatarFile(
  candidateId: string,
  file: File,
): Promise<{ url: string } | { error: string }> {
  const invalid = validateAvatarFile(file);
  if (invalid) return { error: invalid };

  const admin = createAdminClient();
  // One avatar per candidate — clear the folder first.
  const { data: existing } = await admin.storage
    .from(AVATAR_BUCKET)
    .list(candidateId);
  if (existing?.length) {
    await admin.storage
      .from(AVATAR_BUCKET)
      .remove(existing.map((f) => `${candidateId}/${f.name}`));
  }

  const path = `${candidateId}/${Date.now()}.${AVATAR_EXT[file.type]}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const { error } = await admin.storage
    .from(AVATAR_BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: true });
  if (error) return { error: `Photo upload failed: ${error.message}` };

  const {
    data: { publicUrl },
  } = admin.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return { url: publicUrl };
}
