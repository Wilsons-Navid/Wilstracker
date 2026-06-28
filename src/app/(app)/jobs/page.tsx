import Link from "next/link";
import { Settings, Trash2 } from "lucide-react";
import { getProfile } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { deleteJob } from "@/app/actions/jobs";
import CreateJobForm from "@/components/jobs/create-job-form";
import type { Job, Profile } from "@/lib/types";

export default async function JobsPage() {
  const me = await getProfile();
  const isAdmin = me?.role === "admin";
  const supabase = await createClient();

  const [{ data: jobs }, { data: applications }, { data: profiles }] =
    await Promise.all([
      supabase.from("jobs").select("*").order("created_at", { ascending: false }),
      supabase.from("applications").select("id, job_id"),
      isAdmin
        ? supabase.from("profiles").select("id, full_name, role")
        : Promise.resolve({ data: [] as Profile[] }),
    ]);

  const jobList = (jobs as Job[]) ?? [];
  const counts = new Map<string, number>();
  for (const a of (applications as { id: string; job_id: string | null }[]) ?? []) {
    if (a.job_id) counts.set(a.job_id, (counts.get(a.job_id) ?? 0) + 1);
  }

  const allProfiles = (profiles as Profile[]) ?? [];
  const customers = allProfiles.filter((p) => p.role === "customer");
  const ownerName = new Map(allProfiles.map((p) => [p.id, p.full_name]));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
      <div>
        <CreateJobForm customers={isAdmin ? customers : undefined} />
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold">
          Jobs{" "}
          <span className="text-sm font-normal text-muted">
            ({jobList.length})
          </span>
        </h2>

        {jobList.length === 0 ? (
          <p className="text-sm text-muted">No jobs yet. Post one to start.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border/60">
            {jobList.map((job) => (
              <li
                key={job.id}
                className="flex items-center gap-4 py-3 first:pt-0"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/jobs/${job.id}`}
                    className="font-medium hover:text-accent hover:underline"
                  >
                    {job.title}
                  </Link>
                  <div className="text-xs text-muted">
                    {job.location ?? "No location"}
                    {job.status === "closed" && " · Closed"}
                    {isAdmin && (
                      <> · {ownerName.get(job.owner_id) ?? "Unknown"}</>
                    )}
                  </div>
                </div>
                <span className="rounded-full bg-background px-2.5 py-1 text-xs text-muted">
                  {counts.get(job.id) ?? 0} candidate
                  {(counts.get(job.id) ?? 0) === 1 ? "" : "s"}
                </span>
                <Link
                  href={`/jobs/${job.id}`}
                  className="inline-flex items-center gap-1 rounded-md border border-accent/30 px-2.5 py-1 text-xs font-medium text-accent transition hover:bg-accent/10"
                >
                  <Settings className="h-3.5 w-3.5" />
                  Manage
                </Link>
                <form action={deleteJob.bind(null, job.id)}>
                  <button
                    className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
                    title="Delete job"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
