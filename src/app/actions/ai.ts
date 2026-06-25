"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/dal";

export type AssessResult = { ok: true } | { error: string };

export async function assessCandidate(
  candidateId: string,
): Promise<AssessResult> {
  const me = await getProfile();
  if (!me) return { error: "Not authenticated." };

  const supabase = await createClient();

  // RLS ensures the user can only read their own candidate (admins: any).
  const { data: candidate, error: cErr } = await supabase
    .from("candidates")
    .select("id, full_name, resume_text, job_id")
    .eq("id", candidateId)
    .single();
  if (cErr || !candidate) return { error: "Candidate not found." };
  if (!candidate.resume_text?.trim()) {
    return { error: "Add CV / résumé text to this candidate first." };
  }

  let jobBlock = "No specific job attached.";
  if (candidate.job_id) {
    const { data: job } = await supabase
      .from("jobs")
      .select("title, description, location")
      .eq("id", candidate.job_id)
      .single();
    if (job) {
      jobBlock = `Title: ${job.title}\nLocation: ${job.location ?? "—"}\n\n${
        job.description ?? "(no description provided)"
      }`;
    }
  }

  const prompt = `You are an expert technical recruiter screening a candidate for a role. Assess the candidate's CV against the job description and return a structured assessment via the tool. Base every claim ONLY on evidence in the CV — never invent experience. Be specific and concise. This assessment is advisory only and must not be the sole basis for any hiring decision.

<job_description>
${jobBlock}
</job_description>

<candidate>
Name: ${candidate.full_name}
CV:
${candidate.resume_text}
</candidate>`;

  let input: {
    score: number;
    summary: string;
    strengths: string[];
    gaps: string[];
    recommendation: string;
  };

  try {
    const client = new Anthropic(); // reads ANTHROPIC_API_KEY
    const message = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2000,
      tools: [
        {
          name: "submit_assessment",
          description: "Submit the structured CV assessment.",
          // strict: true guarantees the input matches the schema exactly.
          strict: true,
          input_schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              score: {
                type: "integer",
                description: "Overall fit score from 0 to 100.",
              },
              summary: {
                type: "string",
                description:
                  "Two-sentence summary of the candidate's fit for this role.",
              },
              strengths: {
                type: "array",
                description: "2-4 concrete strengths, grounded in the CV.",
                items: { type: "string" },
              },
              gaps: {
                type: "array",
                description: "2-4 concrete gaps or risks relative to the job.",
                items: { type: "string" },
              },
              recommendation: {
                type: "string",
                enum: ["Strong fit", "Possible fit", "Weak fit"],
              },
            },
            required: [
              "score",
              "summary",
              "strengths",
              "gaps",
              "recommendation",
            ],
          },
        },
      ],
      tool_choice: { type: "tool", name: "submit_assessment" },
      messages: [{ role: "user", content: prompt }],
    });

    const block = message.content.find((b) => b.type === "tool_use");
    if (!block || block.type !== "tool_use") {
      return { error: "The AI did not return an assessment. Try again." };
    }
    input = block.input as typeof input;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { error: `AI request failed: ${msg}` };
  }

  const { error: insErr } = await supabase.from("cv_assessments").insert({
    candidate_id: candidate.id,
    job_id: candidate.job_id,
    score: input.score,
    summary: input.summary,
    strengths: input.strengths,
    gaps: input.gaps,
    recommendation: input.recommendation,
    raw_json: input,
  });
  if (insErr) return { error: insErr.message };

  revalidatePath(`/candidates/${candidateId}`);
  return { ok: true };
}
