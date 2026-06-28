"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/dal";

export type JobFormState = { ok: true } | { error: string } | undefined;

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

  const supabase = await createClient();
  const { error } = await supabase
    .from("jobs")
    .insert({ owner_id, title, description, location, status: "open" });

  if (error) return { error: error.message };

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
