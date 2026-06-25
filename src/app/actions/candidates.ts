"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/dal";
import type { CandidateStage } from "@/lib/types";
import { STAGES } from "@/lib/types";

export async function moveCandidateStage(
  candidateId: string,
  stage: CandidateStage,
): Promise<{ error?: string }> {
  // Auth check — Server Actions are public endpoints.
  const profile = await getProfile();
  if (!profile) return { error: "Not authenticated." };
  if (!STAGES.includes(stage)) return { error: "Invalid stage." };

  const supabase = await createClient();
  // RLS guarantees a customer can only move their own candidates.
  const { error } = await supabase
    .from("candidates")
    .update({ stage })
    .eq("id", candidateId);

  if (error) return { error: error.message };

  revalidatePath("/");
  return {};
}
