import Link from "next/link";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCandidate } from "@/lib/dal";
import Avatar from "@/components/ui/avatar";
import { STAGE_LABELS, type CandidateStage } from "@/lib/types";

const TRACK: CandidateStage[] = ["applied", "screening", "interview", "offer", "hired"];

export default async function MyApplicationsPage() {
  const supabase = await createClient();
  const candidate = await getCandidate();
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
      {candidate && (
        <div className="mb-6 flex items-center gap-4">
          <Avatar
            name={candidate.full_name}
            photoUrl={candidate.avatar_url}
            size="lg"
          />
          <div>
            <p className="text-xl font-semibold">{candidate.full_name}</p>
            <Link
              href="/portal/profile"
              className="text-sm text-accent hover:underline"
            >
              Edit profile
            </Link>
          </div>
        </div>
      )}

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
            const isHired = a.stage === "hired";
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
                  <div className="mt-5 flex">
                    {TRACK.map((s, i) => {
                      const done = i < idx || (isHired && i <= idx);
                      const current = i === idx && !isHired;
                      return (
                        <div
                          key={s}
                          className="relative flex flex-1 flex-col items-center"
                        >
                          {/* connector into this step */}
                          {i > 0 && (
                            <span
                              className={`absolute right-1/2 left-0 top-3 h-0.5 ${
                                i <= idx ? "bg-accent" : "bg-border"
                              }`}
                            />
                          )}
                          {/* connector out of this step */}
                          {i < TRACK.length - 1 && (
                            <span
                              className={`absolute right-0 left-1/2 top-3 h-0.5 ${
                                i < idx ? "bg-accent" : "bg-border"
                              }`}
                            />
                          )}
                          <span
                            className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                              done
                                ? "border-accent bg-accent text-white"
                                : current
                                  ? "border-accent bg-accent text-white ring-4 ring-accent/15"
                                  : "border-border bg-surface"
                            }`}
                          >
                            {done ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : (
                              <span
                                className={`h-2 w-2 rounded-full ${
                                  current ? "bg-white" : "bg-border"
                                }`}
                              />
                            )}
                          </span>
                          <span
                            className={`mt-2 text-center text-[11px] leading-tight ${
                              current
                                ? "font-semibold text-foreground"
                                : done
                                  ? "text-foreground"
                                  : "text-muted"
                            }`}
                          >
                            {STAGE_LABELS[s]}
                          </span>
                        </div>
                      );
                    })}
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
