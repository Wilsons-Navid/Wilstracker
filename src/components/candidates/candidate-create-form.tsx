"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  createCandidate,
  type CandidateFormState,
} from "@/app/actions/candidates";
import { STAGES, STAGE_LABELS, type Job } from "@/lib/types";

const inputCls =
  "rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20";

export default function CandidateCreateForm({ jobs }: { jobs: Job[] }) {
  const [state, action, pending] = useActionState<CandidateFormState, FormData>(
    createCandidate,
    undefined,
  );

  return (
    <form
      action={action}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-sm"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="full_name" className="text-sm font-medium">
          Full name
        </label>
        <input id="full_name" name="full_name" required className={inputCls} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="job_id" className="text-sm font-medium">
            Job
          </label>
          <select
            id="job_id"
            name="job_id"
            required
            defaultValue=""
            className={inputCls}
          >
            <option value="" disabled>
              Select a job…
            </option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="stage" className="text-sm font-medium">
            Stage
          </label>
          <select
            id="stage"
            name="stage"
            defaultValue="applied"
            className={inputCls}
          >
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input id="email" name="email" type="email" className={inputCls} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="linkedin_url" className="text-sm font-medium">
            LinkedIn URL
          </label>
          <input
            id="linkedin_url"
            name="linkedin_url"
            type="url"
            placeholder="https://linkedin.com/in/…"
            className={inputCls}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="resume_text" className="text-sm font-medium">
          CV / résumé text{" "}
          <span className="font-normal text-muted">
            (paste for AI assessment)
          </span>
        </label>
        <textarea
          id="resume_text"
          name="resume_text"
          rows={6}
          placeholder="Paste the candidate's CV here…"
          className={inputCls}
        />
      </div>

      {state && "error" in state && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg transition hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Adding…" : "Add candidate"}
        </button>
        <Link
          href="/"
          className="rounded-lg border border-border px-4 py-2.5 text-sm text-muted hover:bg-background"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
