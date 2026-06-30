import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/dal";
import Board from "@/components/board/board";
import type { Job, PipelineCard } from "@/lib/types";

// Cap how many applications the board loads in one pass. The Kanban renders
// every card client-side, so an unbounded fetch would not scale; this keeps the
// payload bounded and we surface the total so nothing looks silently missing.
const BOARD_LIMIT = 500;

export default async function BoardPage() {
  const profile = await getProfile();
  const supabase = await createClient();

  // RLS scopes these automatically: customers see their own rows; admins see all.
  const [{ data: jobs }, { data: apps, count }, { data: assessments }] =
    await Promise.all([
      supabase
        .from("jobs")
        .select("*")
        .order("created_at", { ascending: true }),
      supabase
        .from("applications")
        .select(
          "id, stage, job_id, candidate:candidates(id, full_name, avatar_url, linkedin_url)",
          { count: "exact" },
        )
        .order("applied_at", { ascending: false })
        .limit(BOARD_LIMIT),
      supabase
        .from("cv_assessments")
        .select("application_id, score, created_at")
        .order("created_at", { ascending: false }),
    ]);

  // Keep only the most recent assessment score per application. Rows arrive
  // newest-first, so the first one seen for an application is the latest.
  const scoreByApp = new Map<string, number>();
  for (const a of (assessments as
    | { application_id: string; score: number | null }[]
    | null) ?? []) {
    if (a.score != null && !scoreByApp.has(a.application_id)) {
      scoreByApp.set(a.application_id, a.score);
    }
  }

  // Flatten each application + its candidate into a single board card.
  const cards: PipelineCard[] = (apps ?? []).map((a) => {
    const cand = a.candidate as unknown as {
      id: string;
      full_name: string;
      avatar_url: string | null;
      linkedin_url: string | null;
    };
    return {
      id: a.id as string,
      candidate_id: cand?.id,
      full_name: cand?.full_name,
      avatar_url: cand?.avatar_url ?? null,
      linkedin_url: cand?.linkedin_url ?? null,
      job_id: (a.job_id as string | null) ?? null,
      stage: a.stage as PipelineCard["stage"],
      score: scoreByApp.get(a.id as string) ?? null,
    };
  });

  // For admins, build the list of customers (job owners) so the board can be
  // filtered by customer. Customers themselves only ever see their own rows, so
  // the filter would be pointless clutter — it stays admin-only.
  let owners: { id: string; name: string }[] | undefined;
  if (profile?.role === "admin") {
    const ownerIds = [...new Set(((jobs as Job[]) ?? []).map((j) => j.owner_id))];
    if (ownerIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", ownerIds);
      owners = ((profs as { id: string; full_name: string | null }[]) ?? [])
        .map((p) => ({ id: p.id, name: p.full_name ?? "Unnamed customer" }))
        .sort((a, b) => a.name.localeCompare(b.name));
    } else {
      owners = [];
    }
  }

  const total = count ?? 0;
  const shown = cards.length;

  return (
    <div className="flex h-full flex-col">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Candidate pipeline</h1>
          <p className="text-sm text-muted">
            {profile?.role === "admin"
              ? "Viewing all candidates across every customer."
              : "Drag candidates between stages to update them."}
          </p>
        </div>
        <Link
          href="/candidates/new"
          className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition hover:opacity-90"
        >
          + Add candidate
        </Link>
      </div>

      {shown < total && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Showing the {shown} most recent of {total} applications. Use the job
          filter to narrow results.
        </div>
      )}

      <Board jobs={(jobs as Job[]) ?? []} cards={cards} owners={owners} />
    </div>
  );
}
