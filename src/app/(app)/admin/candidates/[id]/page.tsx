import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, MapPin, Phone } from "lucide-react";
import { requireAdmin } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Avatar from "@/components/ui/avatar";
import { LinkedInIcon } from "@/components/ui/brand-icons";
import { STAGE_LABELS, type Candidate, type CandidateStage } from "@/lib/types";

// Admin view of a candidate ACCOUNT: the person plus every application they
// have, mirroring what the candidate sees in their own portal. `id` is the
// candidate's auth user id (the profiles/accounts key). Admin RLS (is_admin)
// lets the user-scoped client read the candidate, applications, and jobs.
export default async function AdminCandidateAccountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const supabase = await createClient();
  const { data: candidateRow } = await supabase
    .from("candidates")
    .select("*")
    .eq("auth_user_id", id)
    .maybeSingle();

  const candidate = candidateRow as Candidate | null;
  if (!candidate) notFound();

  const { data: appsRaw } = await supabase
    .from("applications")
    .select("id, stage, status, applied_at, job:jobs(title, location)")
    .eq("candidate_id", candidate.id)
    .order("applied_at", { ascending: false });

  const apps = (appsRaw ?? []) as unknown as Array<{
    id: string;
    stage: CandidateStage;
    status: string;
    applied_at: string;
    job: { title: string; location: string | null } | null;
  }>;

  // Email lives in auth.users — fetch with the service-role client (admin only).
  const admin = createAdminClient();
  const { data: authData } = await admin.auth.admin.getUserById(id);
  const email = authData?.user?.email ?? candidate.email ?? "—";

  const stageBadge = (stage: CandidateStage) =>
    stage === "hired"
      ? "bg-emerald-50 text-emerald-700"
      : stage === "rejected"
        ? "bg-rose-50 text-rose-700"
        : "bg-accent/10 text-accent";

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to accounts
      </Link>

      <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <Avatar
          name={candidate.full_name}
          photoUrl={candidate.avatar_url}
          size="lg"
        />
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">{candidate.full_name}</h1>
          {candidate.headline && (
            <p className="text-sm text-muted">{candidate.headline}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              {email}
            </span>
            {candidate.phone && (
              <span className="inline-flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                {candidate.phone}
              </span>
            )}
            {candidate.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {candidate.location}
              </span>
            )}
            {candidate.linkedin_url && (
              <a
                href={candidate.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-accent hover:underline"
              >
                <LinkedInIcon className="h-3.5 w-3.5" />
                LinkedIn
              </a>
            )}
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-base font-semibold">
          Applications{" "}
          <span className="text-sm font-normal text-muted">
            ({apps.length})
          </span>
        </h2>
        {apps.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-6 text-sm text-muted">
            This candidate has not applied to anything yet.
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {apps.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm"
              >
                <div className="min-w-0">
                  <div className="font-medium">
                    {a.job?.title ?? "Role"}
                    {a.job?.location && (
                      <span className="ml-2 text-sm font-normal text-muted">
                        {a.job.location}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted">
                    Applied {new Date(a.applied_at).toLocaleDateString()}
                  </span>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${stageBadge(a.stage)}`}
                >
                  {STAGE_LABELS[a.stage]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
