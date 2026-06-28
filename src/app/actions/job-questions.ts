"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/dal";
import type { QuestionKind } from "@/lib/types";

export type QuestionState = { ok: true } | { error: string } | undefined;

// Parse a textarea of one-option-per-line into a clean string[] (choice kind).
function parseOptions(raw: string): string[] {
  return raw
    .split("\n")
    .map((o) => o.trim())
    .filter(Boolean);
}

export async function addJobQuestion(
  _prev: QuestionState,
  formData: FormData,
): Promise<QuestionState> {
  const me = await getProfile();
  if (!me) return { error: "Not authenticated." };

  const jobId = String(formData.get("job_id") ?? "").trim();
  const prompt = String(formData.get("prompt") ?? "").trim();
  const kind = (String(formData.get("kind") ?? "text") === "choice"
    ? "choice"
    : "text") as QuestionKind;
  const required = formData.get("required") === "on";
  const options = kind === "choice"
    ? parseOptions(String(formData.get("options") ?? ""))
    : [];

  if (!jobId) return { error: "Missing job." };
  if (!prompt) return { error: "Question text is required." };
  if (kind === "choice" && options.length < 2) {
    return { error: "Add at least two choices (one per line)." };
  }

  const supabase = await createClient();

  // Place the new question after the current last one.
  const { data: last } = await supabase
    .from("job_questions")
    .select("position")
    .eq("job_id", jobId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = ((last as { position: number } | null)?.position ?? -1) + 1;

  // RLS (job_questions_insert) ensures only the job's owner/admin can add.
  const { error } = await supabase.from("job_questions").insert({
    job_id: jobId,
    prompt,
    kind,
    options,
    required,
    position,
  });
  if (error) return { error: error.message };

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath(`/careers/${jobId}`);
  return { ok: true };
}

export async function updateJobQuestion(
  _prev: QuestionState,
  formData: FormData,
): Promise<QuestionState> {
  const me = await getProfile();
  if (!me) return { error: "Not authenticated." };

  const id = String(formData.get("question_id") ?? "").trim();
  const jobId = String(formData.get("job_id") ?? "").trim();
  const prompt = String(formData.get("prompt") ?? "").trim();
  const kind = (String(formData.get("kind") ?? "text") === "choice"
    ? "choice"
    : "text") as QuestionKind;
  const required = formData.get("required") === "on";
  const options = kind === "choice"
    ? parseOptions(String(formData.get("options") ?? ""))
    : [];

  if (!id || !jobId) return { error: "Missing identifiers." };
  if (!prompt) return { error: "Question text is required." };
  if (kind === "choice" && options.length < 2) {
    return { error: "Add at least two choices (one per line)." };
  }

  const supabase = await createClient();
  // RLS (job_questions_update) ensures only the job's owner/admin can edit.
  const { error } = await supabase
    .from("job_questions")
    .update({ prompt, kind, options, required })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath(`/careers/${jobId}`);
  return { ok: true };
}

export async function deleteJobQuestion(
  questionId: string,
  jobId: string,
): Promise<void> {
  const me = await getProfile();
  if (!me) return;

  const supabase = await createClient();
  // RLS (job_questions_delete) ensures only the job's owner/admin can delete.
  await supabase.from("job_questions").delete().eq("id", questionId);

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath(`/careers/${jobId}`);
}
