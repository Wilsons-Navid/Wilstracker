import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteCandidate } from "@/app/actions/candidates";
import CandidateEditForm from "@/components/candidates/candidate-edit-form";
import AssessmentPanel from "@/components/candidates/assessment-panel";
import ResumeUpload from "@/components/candidates/resume-upload";
import AvatarUpload from "@/components/candidates/avatar-upload";
import Avatar from "@/components/ui/avatar";
import { getResumeSignedUrl } from "@/app/actions/resume";
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

  const resumeSignedUrl = c.resume_url
    ? await getResumeSignedUrl(c.id)
    : null;

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
          <div className="mt-2 flex items-center gap-4">
            <Avatar name={c.full_name} photoUrl={c.avatar_url} size="lg" />
            <div>
              <h1 className="text-xl font-semibold">{c.full_name}</h1>
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
          </div>
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
          hasResume={!!c.resume_text?.trim() || !!c.resume_url}
          latest={(assessment as CvAssessment | null) ?? null}
        />
        <AvatarUpload
          candidateId={c.id}
          name={c.full_name}
          avatarUrl={c.avatar_url}
        />
        <ResumeUpload
          candidateId={c.id}
          hasFile={!!c.resume_url}
          signedUrl={resumeSignedUrl}
        />
        <CandidateEditForm candidate={c} />
      </div>
    </div>
  );
}
