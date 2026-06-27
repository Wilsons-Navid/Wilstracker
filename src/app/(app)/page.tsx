import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/dal";
import Board from "@/components/board/board";
import type { Candidate, Job } from "@/lib/types";

// Cap how many candidate rows the board loads in one pass. The Kanban renders
// every card client-side, so an unbounded fetch would not scale; this keeps the
// payload bounded and we surface the total so nothing looks silently missing.
const BOARD_LIMIT = 500;

export default async function BoardPage() {
  const profile = await getProfile();
  const supabase = await createClient();

  // RLS scopes these automatically: customers see their own rows; admins see all.
  const [{ data: jobs }, { data: candidates, count }] = await Promise.all([
    supabase.from("jobs").select("*").order("created_at", { ascending: true }),
    supabase
      .from("candidates")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(BOARD_LIMIT),
  ]);

  const total = count ?? 0;
  const shown = candidates?.length ?? 0;

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
          Showing the {shown} most recent of {total} candidates. Use the job
          filter to narrow results.
        </div>
      )}

      <Board jobs={(jobs as Job[]) ?? []} candidates={(candidates as Candidate[]) ?? []} />
    </div>
  );
}
