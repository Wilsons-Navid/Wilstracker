import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteCandidate } from "@/app/actions/candidates";
import CandidateEditForm from "@/components/candidates/candidate-edit-form";
import AssessmentPanel from "@/components/candidates/assessment-panel";
import type { Candidate, CvAssessment, Job } from "@/lib/types";

export default async function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: candidate } = await supabase
    .from("candidates")
    .select("*")
    .eq("id", id)
    .single();

  if (!candidate) notFound();
  const c = candidate as Candidate;

  const [{ data: job }, { data: assessment }] = await Promise.all([
    c.job_id
      ? supabase.from("jobs").select("*").eq("id", c.job_id).single()
      : Promise.resolve({ data: null }),
    supabase
      .from("cv_assessments")
      .select("*")
      .eq("candidate_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <Link href="/" className="text-sm text-muted hover:text-foreground">
            ← Back to board
          </Link>
          <h1 className="mt-2 text-xl font-semibold">{c.full_name}</h1>
          <p className="text-sm text-muted">
            {(job as Job | null)?.title ?? "No job"}
            {c.linkedin_url && (
              <>
                {" · "}
                <a
                  href={c.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  LinkedIn ↗
                </a>
              </>
            )}
          </p>
        </div>
        <form action={deleteCandidate.bind(null, c.id)}>
          <button className="rounded-md border border-border px-3 py-1.5 text-sm text-muted hover:bg-red-50 hover:text-red-600">
            Delete
          </button>
        </form>
      </div>

      <div className="flex flex-col gap-6">
        <AssessmentPanel
          candidateId={c.id}
          hasResume={!!c.resume_text?.trim()}
          latest={(assessment as CvAssessment | null) ?? null}
        />
        <CandidateEditForm candidate={c} />
      </div>
    </div>
  );
}
