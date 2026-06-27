import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import ApplyForm from "@/components/careers/apply-form";
import type { Job } from "@/lib/types";

export default async function CareerJobPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const admin = createAdminClient();
  const { data } = await admin
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .eq("status", "open")
    .single();
  if (!data) notFound();
  const job = data as Job;

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/careers" className="text-sm text-muted hover:text-foreground">
        ← All positions
      </Link>

      <header className="mt-4 mb-8">
        <h1 className="text-2xl font-semibold">{job.title}</h1>
        <p className="mt-1 text-sm text-muted">
          {job.location ?? "Location flexible"}
        </p>
      </header>

      {job.description && (
        <section className="mb-10 whitespace-pre-wrap text-sm leading-relaxed">
          {job.description}
        </section>
      )}

      <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold">Apply for this role</h2>
        <ApplyForm jobId={job.id} />
      </section>
    </main>
  );
}
