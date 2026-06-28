import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrigin } from "@/lib/site";
import JobEditForm from "@/components/jobs/job-edit-form";
import JobQuestionsManager from "@/components/jobs/job-questions-manager";
import ShareJob from "@/components/jobs/share-job";
import type { Job, JobQuestion } from "@/lib/types";

export default async function ManageJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // RLS limits this to the job's owner (or an admin).
  const { data: jobData } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .single();
  if (!jobData) notFound();
  const job = jobData as Job;

  const { data: questionData } = await supabase
    .from("job_questions")
    .select("*")
    .eq("job_id", id)
    .order("position", { ascending: true });
  const questions = (questionData as JobQuestion[]) ?? [];
  const shareUrl = `${await getOrigin()}/careers/${job.id}`;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5">
        <Link href="/jobs" className="text-sm text-muted hover:text-foreground">
          ← Back to jobs
        </Link>
        <div className="mt-2 flex items-center justify-between gap-4">
          <h1 className="text-xl font-semibold">{job.title}</h1>
          <span
            className={`rounded-full px-2.5 py-1 text-xs ${
              job.status === "closed"
                ? "bg-background text-muted"
                : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {job.status === "closed" ? "Closed" : "Open"}
          </span>
        </div>
        <Link
          href={`/careers/${job.id}`}
          className="text-sm text-accent hover:underline"
        >
          View public page ↗
        </Link>
      </div>

      <div className="flex flex-col gap-6">
        <JobEditForm job={job} />
        <JobQuestionsManager jobId={job.id} questions={questions} />
        <ShareJob url={shareUrl} title={job.title} />
      </div>
    </div>
  );
}
