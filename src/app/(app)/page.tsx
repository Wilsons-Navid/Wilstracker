import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/dal";
import Board from "@/components/board/board";
import type { Candidate, Job } from "@/lib/types";

export default async function BoardPage() {
  const profile = await getProfile();
  const supabase = await createClient();

  // RLS scopes these automatically: customers see their own rows; admins see all.
  const [{ data: jobs }, { data: candidates }] = await Promise.all([
    supabase.from("jobs").select("*").order("created_at", { ascending: true }),
    supabase
      .from("candidates")
      .select("*")
      .order("created_at", { ascending: true }),
  ]);

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

      <Board jobs={(jobs as Job[]) ?? []} candidates={(candidates as Candidate[]) ?? []} />
    </div>
  );
}
