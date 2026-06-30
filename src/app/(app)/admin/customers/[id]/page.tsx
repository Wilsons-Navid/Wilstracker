import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  MapPin,
  CalendarDays,
  Briefcase,
  LayoutGrid,
  Users,
} from "lucide-react";
import { requireAdmin } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Avatar from "@/components/ui/avatar";
import {
  STAGES,
  STAGE_LABELS,
  type Profile,
  type Job,
  type CandidateStage,
} from "@/lib/types";

// Admin view of a CUSTOMER account: who they are, their company context, the
// jobs they own, and a summary of their pipeline. Mirrors the candidate view.
// `id` is the profile / account id. Admin RLS (is_admin) lets the user-scoped
// client read every customer's jobs and applications.
export default async function AdminCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const supabase = await createClient();
  const { data: profileRow } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  const profile = profileRow as Profile | null;
  // This page is for customer accounts only. Candidates have their own view,
  // and admins don't own jobs so there's nothing meaningful to show.
  if (!profile || profile.role !== "customer") notFound();

  const { data: jobsRaw } = await supabase
    .from("jobs")
    .select("*")
    .eq("owner_id", id)
    .order("created_at", { ascending: false });
  const jobs = (jobsRaw as Job[]) ?? [];

  // Pull this customer's applications to count per job and per stage.
  const jobIds = jobs.map((j) => j.id);
  const { data: appsRaw } = jobIds.length
    ? await supabase
        .from("applications")
        .select("id, stage, job_id")
        .in("job_id", jobIds)
    : { data: [] };
  const apps = (appsRaw as { id: string; stage: CandidateStage; job_id: string }[]) ?? [];

  const countByJob = new Map<string, number>();
  const countByStage = new Map<CandidateStage, number>();
  for (const a of apps) {
    countByJob.set(a.job_id, (countByJob.get(a.job_id) ?? 0) + 1);
    countByStage.set(a.stage, (countByStage.get(a.stage) ?? 0) + 1);
  }

  // Email lives in auth.users — fetch with the service-role client (admin only).
  const admin = createAdminClient();
  const { data: authData } = await admin.auth.admin.getUserById(id);
  const email = authData?.user?.email ?? "—";

  const openJobs = jobs.filter((j) => j.status !== "closed").length;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to accounts
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <Avatar name={profile.full_name ?? "?"} photoUrl={null} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold">
              {profile.full_name ?? "Unnamed customer"}
            </h1>
            <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted">
              customer
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                profile.active
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-rose-50 text-rose-700"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  profile.active ? "bg-emerald-500" : "bg-rose-500"
                }`}
              />
              {profile.active ? "Active" : "Deactivated"}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              {email}
            </span>
            {profile.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {profile.location}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              Customer since {new Date(profile.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/board?customer=${id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium transition hover:bg-background"
          >
            <LayoutGrid className="h-4 w-4" />
            View their board
          </Link>
        </div>
      </div>

      {/* About / Company */}
      <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="mb-2 text-base font-semibold">About / Company</h2>
        {profile.description ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {profile.description}
          </p>
        ) : (
          <p className="text-sm text-muted">
            No company description added yet. Use Edit on the accounts page to add
            context for this customer.
          </p>
        )}
      </section>

      {/* Pipeline summary */}
      <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-muted" />
          <h2 className="text-base font-semibold">Pipeline</h2>
          <span className="text-sm font-normal text-muted">
            {apps.length} candidate{apps.length === 1 ? "" : "s"} across{" "}
            {jobs.length} job{jobs.length === 1 ? "" : "s"} ({openJobs} open)
          </span>
        </div>
        {apps.length === 0 ? (
          <p className="text-sm text-muted">No candidates in the pipeline yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {STAGES.map((stage) => {
              const n = countByStage.get(stage) ?? 0;
              if (n === 0) return null;
              return (
                <span
                  key={stage}
                  className="inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-1 text-xs font-medium text-muted"
                >
                  {STAGE_LABELS[stage]}
                  <span className="rounded-full bg-accent/10 px-1.5 text-accent">
                    {n}
                  </span>
                </span>
              );
            })}
          </div>
        )}
      </section>

      {/* Their jobs */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-muted" />
          <h2 className="text-base font-semibold">
            Jobs{" "}
            <span className="text-sm font-normal text-muted">
              ({jobs.length})
            </span>
          </h2>
        </div>
        {jobs.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-6 text-sm text-muted">
            This customer has not posted any jobs yet.
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {jobs.map((j) => (
              <li
                key={j.id}
                className="rounded-xl border border-border bg-surface p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/jobs/${j.id}`}
                        className="font-medium hover:text-accent hover:underline"
                      >
                        {j.title}
                      </Link>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          j.status === "closed"
                            ? "bg-background text-muted"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {j.status === "closed" ? "Closed" : "Open"}
                      </span>
                    </div>
                    {j.location && (
                      <p className="mt-0.5 text-xs text-muted">{j.location}</p>
                    )}
                    {j.description && (
                      <p className="mt-2 line-clamp-2 text-sm text-muted">
                        {j.description}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full bg-background px-2.5 py-0.5 text-xs font-medium text-muted">
                    {countByJob.get(j.id) ?? 0} candidate
                    {(countByJob.get(j.id) ?? 0) === 1 ? "" : "s"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
