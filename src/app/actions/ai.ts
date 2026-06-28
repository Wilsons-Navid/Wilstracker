"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/dal";
import { ensureResumeText } from "@/lib/extract";

export type AssessResult = { ok: true } | { error: string };

export async function assessCandidate(
  applicationId: string,
): Promise<AssessResult> {
  const me = await getProfile();
  if (!me) return { error: "Not authenticated." };

  const supabase = await createClient();

  // RLS ensures the user can only read applications they own (admins: any).
  const { data: app, error: aErr } = await supabase
    .from("applications")
    .select(
      "id, job_id, candidate:candidates(id, full_name, resume_text, resume_url)",
    )
    .eq("id", applicationId)
    .single();
  if (aErr || !app) return { error: "Application not found." };

  const candidate = app.candidate as unknown as {
    id: string;
    full_name: string;
    resume_text: string | null;
    resume_url: string | null;
  };
  const jobId = app.job_id as string | null;

  // The AI scores the extracted *text* (cheap), never the PDF document. The text
  // is normally cached at upload / on the candidate page; this backfills it for
  // older résumés on first use.
  const cvText = await ensureResumeText(candidate);

  if (!cvText) {
    return {
      error:
        "Couldn't read the résumé text. Upload a text-based PDF or DOCX, or paste the CV text on the candidate.",
    };
  }
  // A score is only meaningful against a specific role — require the job.
  if (!jobId) {
    return {
      error:
        "Attach a job to this candidate first — the assessment scores the CV against a specific role.",
    };
  }

  const { data: job } = await supabase
    .from("jobs")
    .select("title, description, location")
    .eq("id", jobId)
    .single();
  if (!job) {
    return {
      error: "The attached job could not be loaded. Re-attach a job and try again.",
    };
  }
  const jobBlock = `Title: ${job.title}\nLocation: ${job.location ?? "—"}\n\n${
    job.description ?? "(no description provided)"
  }`;

  const promptHeader = `You are an expert technical recruiter screening a candidate for a specific role. Score the CV against the job description using the rubric below, then return the structured assessment via the tool.

Scoring rubric — award each component independently (total = 100):
- skills_match (0-50): how well the candidate's concrete skills cover the job's required and preferred skills.
- experience_match (0-30): depth and relevance of prior experience to this role's responsibilities and seniority.
- domain_fit (0-20): industry/domain alignment, role level, location, and overall trajectory fit.

Rules:
- Base every component and claim ONLY on evidence in the CV — never invent experience. Absence of evidence lowers the relevant component.
- Justify the sub-scores through the strengths and gaps you list.
- Be specific and concise. This assessment is advisory only and must not be the sole basis for any hiring decision.

<job_description>
${jobBlock}
</job_description>

Candidate name: ${candidate.full_name}`;

  // Always send the extracted text — never the PDF document block — to keep the
  // assessment cheap.
  const content: Anthropic.MessageParam["content"] = `${promptHeader}\n\nCV:\n${cvText}`;

  let input: {
    breakdown: {
      skills_match: number;
      experience_match: number;
      domain_fit: number;
    };
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
              breakdown: {
                type: "object",
                additionalProperties: false,
                description: "Rubric sub-scores; the total is their sum.",
                properties: {
                  skills_match: {
                    type: "integer",
                    description: "Required/preferred skills coverage, 0-50.",
                  },
                  experience_match: {
                    type: "integer",
                    description: "Relevant experience depth, 0-30.",
                  },
                  domain_fit: {
                    type: "integer",
                    description: "Domain/seniority/location fit, 0-20.",
                  },
                },
                required: ["skills_match", "experience_match", "domain_fit"],
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
              "breakdown",
              "summary",
              "strengths",
              "gaps",
              "recommendation",
            ],
          },
        },
      ],
      tool_choice: { type: "tool", name: "submit_assessment" },
      messages: [{ role: "user", content }],
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

  // Total is derived from the rubric so the score is always the sum of its parts.
  const { skills_match, experience_match, domain_fit } = input.breakdown;
  const score = Math.max(
    0,
    Math.min(100, skills_match + experience_match + domain_fit),
  );

  const { error: insErr } = await supabase.from("cv_assessments").insert({
    application_id: app.id,
    score,
    summary: input.summary,
    strengths: input.strengths,
    gaps: input.gaps,
    recommendation: input.recommendation,
    raw_json: input,
  });
  if (insErr) return { error: insErr.message };

  revalidatePath(`/candidates/${applicationId}`);
  return { ok: true };
}
