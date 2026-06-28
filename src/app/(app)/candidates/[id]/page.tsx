import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteCandidate } from "@/app/actions/candidates";
import CandidateEditForm from "@/components/candidates/candidate-edit-form";
import AssessmentPanel from "@/components/candidates/assessment-panel";
import ResumeUpload from "@/components/candidates/resume-upload";
import Avatar from "@/components/ui/avatar";
import { getResumeSignedUrl } from "@/app/actions/resume";
import type { Application, Candidate, CvAssessment, Job } from "@/lib/types";

export default async function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // [id] is the application id. Load it with its candidate (the person) and job.
  const { data: application } = await supabase
    .from("applications")
    .select("*, candidate:candidates(*), job:jobs(*)")
    .eq("id", id)
    .single();

  if (!application) notFound();
  const app = application as Application & { candidate: Candidate; job: Job | null };
  const c = app.candidate;
  const job = app.job;

  const resumeSignedUrl = c.resume_url ? await getResumeSignedUrl(c.id) : null;

  const { data: assessment } = await supabase
    .from("cv_assessments")
    .select("*")
    .eq("application_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Answers to any extra questions on the job, with their prompts.
  const { data: answerData } = await supabase
    .from("application_answers")
    .select("id, answer, question:job_questions(prompt)")
    .eq("application_id", id);
  const answers =
    (answerData as
      | { id: string; answer: string | null; question: { prompt: string } | null }[]
      | null) ?? [];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <Link href="/board" className="text-sm text-muted hover:text-foreground">
            ← Back to board
          </Link>
          <div className="mt-2 flex items-center gap-4">
            <Avatar name={c.full_name} photoUrl={c.avatar_url} size="lg" />
            <div>
              <h1 className="text-xl font-semibold">{c.full_name}</h1>
              <p className="text-sm text-muted">
                {job?.title ?? "No job"}
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
        <form action={deleteCandidate.bind(null, app.id)}>
          <button className="rounded-md border border-border px-3 py-1.5 text-sm text-muted hover:bg-red-50 hover:text-red-600">
            Delete
          </button>
        </form>
      </div>

      <div className="flex flex-col gap-6">
        <AssessmentPanel
          applicationId={app.id}
          hasResume={!!c.resume_text?.trim() || !!c.resume_url}
          latest={(assessment as CvAssessment | null) ?? null}
        />
        <ResumeUpload
          candidateId={c.id}
          hasFile={!!c.resume_url}
          signedUrl={resumeSignedUrl}
        />

        {answers.length > 0 && (
          <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold">Application answers</h2>
            <dl className="flex flex-col gap-4">
              {answers.map((a) => (
                <div key={a.id}>
                  <dt className="text-sm font-medium">
                    {a.question?.prompt ?? "Question"}
                  </dt>
                  <dd className="mt-0.5 whitespace-pre-wrap text-sm text-muted">
                    {a.answer || "—"}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <CandidateEditForm candidate={c} application={app} />
      </div>
    </div>
  );
}
