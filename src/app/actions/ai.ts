"use server";

import Anthropic from "@anthropic-ai/sdk";
import mammoth from "mammoth";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/dal";

export type AssessResult = { ok: true } | { error: string };

/** Pull plain text out of an uploaded .docx in the resumes bucket. Returns null on any failure. */
async function extractDocxText(path: string): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const { data: blob, error } = await admin.storage
      .from("resumes")
      .download(path);
    if (error || !blob) return null;
    const { value } = await mammoth.extractRawText({
      buffer: Buffer.from(await blob.arrayBuffer()),
    });
    return value.trim() || null;
  } catch {
    return null;
  }
}

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
      "id, job_id, candidate:candidates(full_name, resume_text, resume_url)",
    )
    .eq("id", applicationId)
    .single();
  if (aErr || !app) return { error: "Application not found." };

  const candidate = app.candidate as unknown as {
    full_name: string;
    resume_text: string | null;
    resume_url: string | null;
  };
  const jobId = app.job_id as string | null;

  const hasText = !!candidate.resume_text?.trim();
  const isPdf = /\.pdf$/i.test(candidate.resume_url ?? "");
  if (!hasText && !candidate.resume_url) {
    return {
      error: "Add a résumé first — upload a file or paste the CV text.",
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

  // Prefer the uploaded résumé file (PDF — Claude reads it natively, OCR included);
  // fall back to pasted CV text. DOC/DOCX can't be sent directly.
  let content: Anthropic.MessageParam["content"];
  if (candidate.resume_url && isPdf) {
    const admin = createAdminClient();
    const { data: blob, error: dlErr } = await admin.storage
      .from("resumes")
      .download(candidate.resume_url);
    if (dlErr || !blob) {
      return { error: "Could not load the résumé file. Try re-uploading it." };
    }
    const data = Buffer.from(await blob.arrayBuffer()).toString("base64");
    content = [
      {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data },
      },
      {
        type: "text",
        text: `${promptHeader}\n\nThe candidate's CV is the attached PDF document.`,
      },
    ];
  } else {
    // Text path: prefer extracting an uploaded .docx, else use pasted text.
    let cvText = candidate.resume_text?.trim() ?? "";
    if (candidate.resume_url && /\.docx$/i.test(candidate.resume_url)) {
      const extracted = await extractDocxText(candidate.resume_url);
      if (extracted) cvText = extracted;
    }
    if (!cvText) {
      return {
        error: candidate.resume_url
          ? "Couldn't read text from this résumé file (legacy .doc isn't supported). Upload a PDF or .docx, or paste the CV text."
          : "Add a résumé first — upload a PDF/Word file or paste the CV text.",
      };
    }
    content = `${promptHeader}\n\nCV:\n${cvText}`;
  }

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
