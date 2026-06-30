"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/dal";
import type { QuestionKind } from "@/lib/types";

export type JobFormState = { ok: true } | { error: string } | undefined;

// A question drafted in the post-a-job form, before the job exists. Mirrors the
// fields job_questions stores; positions are assigned on insert.
type DraftQuestion = {
  prompt: string;
  kind: QuestionKind;
  required: boolean;
  options: string[];
};

// Parse the hidden `questions` JSON the create form submits, dropping anything
// malformed. Returns a clean, validated list ready to insert.
function parseDraftQuestions(raw: string): DraftQuestion[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const out: DraftQuestion[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const q = item as Record<string, unknown>;
    const prompt = String(q.prompt ?? "").trim();
    if (!prompt) continue;
    const kind: QuestionKind = q.kind === "choice" ? "choice" : "text";
    const required = q.required === true;
    const options =
      kind === "choice" && Array.isArray(q.options)
        ? q.options.map((o) => String(o).trim()).filter(Boolean)
        : [];
    // A choice with fewer than two options is meaningless; skip it.
    if (kind === "choice" && options.length < 2) continue;
    out.push({ prompt, kind, required, options });
  }
  return out;
}

export async function createJob(
  _prev: JobFormState,
  formData: FormData,
): Promise<JobFormState> {
  const me = await getProfile();
  if (!me) return { error: "Not authenticated." };

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const location = String(formData.get("location") ?? "").trim() || null;
  const ownerInput = String(formData.get("owner_id") ?? "").trim();

  if (!title) return { error: "Job title is required." };

  // Customers always own their own jobs. Admins may post on a customer's behalf.
  let owner_id = me.id;
  if (me.role === "admin") {
    if (!ownerInput) return { error: "Select which customer this job is for." };
    owner_id = ownerInput;
  }

  const questions = parseDraftQuestions(String(formData.get("questions") ?? ""));

  const supabase = await createClient();
  const { data: job, error } = await supabase
    .from("jobs")
    .insert({ owner_id, title, description, location, status: "open" })
    .select("id")
    .single();

  if (error) return { error: error.message };

  // Insert any application questions drafted alongside the job. RLS
  // (job_questions_insert) ensures only the job's owner/admin can add them.
  if (questions.length > 0 && job) {
    const rows = questions.map((q, i) => ({
      job_id: (job as { id: string }).id,
      prompt: q.prompt,
      kind: q.kind,
      options: q.options,
      required: q.required,
      position: i,
    }));
    const { error: qErr } = await supabase.from("job_questions").insert(rows);
    if (qErr) {
      // The job was created; surface the questions failure without losing it.
      revalidatePath("/jobs");
      revalidatePath("/");
      return {
        error: `Job posted, but its questions failed to save (${qErr.message}). Add them from the job's manage page.`,
      };
    }
  }

  revalidatePath("/jobs");
  revalidatePath("/");
  return { ok: true };
}

export async function updateJob(
  _prev: JobFormState,
  formData: FormData,
): Promise<JobFormState> {
  const me = await getProfile();
  if (!me) return { error: "Not authenticated." };

  const jobId = String(formData.get("job_id") ?? "").trim();
  if (!jobId) return { error: "Missing job." };

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Job title is required." };

  const description = String(formData.get("description") ?? "").trim() || null;
  const location = String(formData.get("location") ?? "").trim() || null;
  const status = String(formData.get("status") ?? "open") === "closed"
    ? "closed"
    : "open";

  const supabase = await createClient();
  // RLS ensures only the job's owner (or an admin) can update it.
  const { error } = await supabase
    .from("jobs")
    .update({ title, description, location, status })
    .eq("id", jobId);

  if (error) return { error: error.message };

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/careers");
  revalidatePath(`/careers/${jobId}`);
  return { ok: true };
}

export async function deleteJob(jobId: string): Promise<void> {
  const me = await getProfile();
  if (!me) return;

  const supabase = await createClient();
  // RLS ensures only an owner (or admin) can delete.
  await supabase.from("jobs").delete().eq("id", jobId);

  revalidatePath("/jobs");
  revalidatePath("/");
}
