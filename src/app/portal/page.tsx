import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STAGE_LABELS, type CandidateStage } from "@/lib/types";

const TRACK: CandidateStage[] = ["applied", "screening", "interview", "offer", "hired"];

export default async function MyApplicationsPage() {
  const supabase = await createClient();
  // RLS returns only this candidate's applications; the applicant job-read
  // policy makes the joined job title visible.
  const { data } = await supabase
    .from("applications")
    .select("id, stage, status, applied_at, job:jobs(title, location)")
    .order("applied_at", { ascending: false });

  const apps = (data ?? []) as unknown as Array<{
    id: string;
    stage: CandidateStage;
    status: string;
    applied_at: string;
    job: { title: string; location: string | null } | null;
  }>;

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">My applications</h1>
      <p className="mb-6 text-sm text-muted">
        Track where you are in each hiring process.
      </p>

      {apps.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-6 text-sm text-muted">
          You have not applied to anything yet.{" "}
          <Link href="/careers" className="text-accent hover:underline">
            Browse open roles
          </Link>
          .
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {apps.map((a) => {
            const rejected = a.stage === "rejected";
            const idx = TRACK.indexOf(a.stage);
            return (
              <li
                key={a.id}
                className="rounded-2xl border border-border bg-surface p-5 shadow-sm"
              >
                <div className="flex items-baseline justify-between gap-3">
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

                {rejected ? (
                  <p className="mt-3 inline-block rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-600">
                    Not moving forward
                  </p>
                ) : (
                  <div className="mt-4 flex items-center gap-1.5">
                    {TRACK.map((s, i) => (
                      <div key={s} className="flex flex-1 flex-col items-center gap-1">
                        <div
                          className={`h-1.5 w-full rounded-full ${
                            i <= idx ? "bg-accent" : "bg-background"
                          }`}
                        />
                        <span
                          className={`text-[11px] ${
                            i === idx ? "font-semibold text-foreground" : "text-muted"
                          }`}
                        >
                          {STAGE_LABELS[s]}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
