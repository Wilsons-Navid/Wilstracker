import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Job } from "@/lib/types";

export const metadata = { title: "Open positions — WilsTracker" };

// Reflect live open jobs, not a build-time snapshot.
export const dynamic = "force-dynamic";

// Public careers board. Reads open jobs through the service-role client on the
// server, so no anonymous RLS policy is exposed. Lists every open role.
export default async function CareersPage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("jobs")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false });
  const jobs = (data as Job[]) ?? [];

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <header className="mb-10">
        <h1 className="text-2xl font-semibold">Open positions</h1>
        <p className="mt-1 text-sm text-muted">
          Browse the roles below and apply in a couple of minutes.
        </p>
      </header>

      {jobs.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-6 text-sm text-muted">
          There are no open positions right now. Please check back soon.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {jobs.map((job) => (
            <li key={job.id}>
              <Link
                href={`/careers/${job.id}`}
                className="block rounded-xl border border-border bg-surface p-5 transition hover:border-accent"
              >
                <div className="font-medium">{job.title}</div>
                <div className="mt-0.5 text-sm text-muted">
                  {job.location ?? "Location flexible"}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
