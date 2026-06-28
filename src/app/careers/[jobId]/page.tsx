import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile, getCandidate } from "@/lib/dal";
import CandidateApplyForm from "@/components/careers/candidate-apply-form";
import ShareJob from "@/components/jobs/share-job";
import { getOrigin } from "@/lib/site";
import type { Job, JobQuestion } from "@/lib/types";

export default async function CareerJobPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const admin = createAdminClient();
  const { data } = await admin
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .eq("status", "open")
    .single();
  if (!data) notFound();
  const job = data as Job;

  const { data: questionData } = await admin
    .from("job_questions")
    .select("*")
    .eq("job_id", job.id)
    .order("position", { ascending: true });
  const questions = (questionData as JobQuestion[]) ?? [];

  const profile = await getProfile();
  const next = `/careers/${job.id}`;

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/careers" className="text-sm text-muted hover:text-foreground">
        ← All positions
      </Link>

      <header className="mt-4 mb-8">
        <h1 className="text-2xl font-semibold">{job.title}</h1>
        <p className="mt-1 text-sm text-muted">
          {job.location ?? "Location flexible"}
        </p>
      </header>

      {job.description && (
        <section className="mb-10 whitespace-pre-wrap text-sm leading-relaxed">
          {job.description}
        </section>
      )}

      <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold">Apply for this role</h2>
        {await renderApplySection(job, profile, next, questions)}
      </section>

      <div className="mt-6">
        <ShareJob url={`${await getOrigin()}/careers/${job.id}`} title={job.title} />
      </div>
    </main>
  );
}

async function renderApplySection(
  job: Job,
  profile: { role: string } | null,
  next: string,
  questions: JobQuestion[],
) {
  // Signed-out visitor: send them to sign in / sign up, then back to this job.
  if (!profile) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted">
          Sign in or create an account to apply. It only takes a minute, and you
          can track your application afterwards.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/login?next=${encodeURIComponent(next)}`}
            className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg transition hover:opacity-90"
          >
            Sign in to apply
          </Link>
          <Link
            href={`/signup?next=${encodeURIComponent(next)}`}
            className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold transition hover:bg-background"
          >
            Create an account
          </Link>
        </div>
      </div>
    );
  }

  // Signed-in staff don't apply to roles.
  if (profile.role !== "candidate") {
    return (
      <p className="text-sm text-muted">
        You&apos;re signed in as a staff account. Applications are submitted from
        a candidate account.
      </p>
    );
  }

  const candidate = await getCandidate();
  if (!candidate) {
    return (
      <p className="text-sm text-muted">
        We couldn&apos;t load your candidate profile. Please sign out and back in.
      </p>
    );
  }

  return (
    <CandidateApplyForm
      jobId={job.id}
      fullName={candidate.full_name}
      email={candidate.email}
      hasResume={!!candidate.resume_url}
      questions={questions}
    />
  );
}
