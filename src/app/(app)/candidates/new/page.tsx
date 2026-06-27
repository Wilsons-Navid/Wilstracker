import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import CandidateCreateForm from "@/components/candidates/candidate-create-form";
import type { Job } from "@/lib/types";

export default async function NewCandidatePage() {
  const supabase = await createClient();
  const { data: jobs } = await supabase
    .from("jobs")
    .select("*")
    .order("title", { ascending: true });

  const jobList = (jobs as Job[]) ?? [];

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5">
        <Link href="/board" className="text-sm text-muted hover:text-foreground">
          ← Back to board
        </Link>
        <h1 className="mt-2 text-lg font-semibold">Add candidate</h1>
      </div>

      {jobList.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-muted">
          You need at least one job first.{" "}
          <Link href="/jobs" className="text-accent hover:underline">
            Post a job
          </Link>
          .
        </div>
      ) : (
        <CandidateCreateForm jobs={jobList} />
      )}
    </div>
  );
}
