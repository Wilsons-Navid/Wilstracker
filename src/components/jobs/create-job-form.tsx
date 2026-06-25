"use client";

import { useActionState, useEffect, useRef } from "react";
import { createJob, type JobFormState } from "@/app/actions/jobs";
import type { Profile } from "@/lib/types";

export default function CreateJobForm({
  customers,
}: {
  customers?: Pick<Profile, "id" | "full_name">[];
}) {
  const [state, action, pending] = useActionState<JobFormState, FormData>(
    createJob,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "ok" in state) formRef.current?.reset();
  }, [state]);

  const isAdmin = !!customers;

  return (
    <form
      ref={formRef}
      action={action}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-sm"
    >
      <div>
        <h2 className="text-base font-semibold">Post a job</h2>
        <p className="text-sm text-muted">Candidates can be added against it.</p>
      </div>

      {isAdmin && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="owner_id" className="text-sm font-medium">
            Customer
          </label>
          <select
            id="owner_id"
            name="owner_id"
            required
            defaultValue=""
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          >
            <option value="" disabled>
              Select a customer…
            </option>
            {customers!.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name ?? c.id}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="title" className="text-sm font-medium">
          Job title
        </label>
        <input
          id="title"
          name="title"
          required
          className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          placeholder="Senior Frontend Engineer"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="location" className="text-sm font-medium">
          Location
        </label>
        <input
          id="location"
          name="location"
          className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          placeholder="Remote / Lagos, NG"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-sm font-medium">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          placeholder="Role summary, requirements, responsibilities…"
        />
      </div>

      {state && "error" in state && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-accent px-3 py-2.5 text-sm font-semibold text-accent-fg transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Posting…" : "Post job"}
      </button>
    </form>
  );
}
