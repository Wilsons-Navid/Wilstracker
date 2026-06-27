"use client";

import { useActionState } from "react";
import {
  updateCandidate,
  type CandidateFormState,
} from "@/app/actions/candidates";
import {
  STAGES,
  STAGE_LABELS,
  type Application,
  type Candidate,
} from "@/lib/types";

const inputCls =
  "rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20";

export default function CandidateEditForm({
  candidate,
  application,
}: {
  candidate: Candidate;
  application: Application;
}) {
  const [state, action, pending] = useActionState<CandidateFormState, FormData>(
    updateCandidate,
    undefined,
  );

  return (
    <form
      action={action}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-sm"
    >
      <input type="hidden" name="candidate_id" value={candidate.id} />
      <input type="hidden" name="application_id" value={application.id} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="full_name" className="text-sm font-medium">
            Full name
          </label>
          <input
            id="full_name"
            name="full_name"
            required
            defaultValue={candidate.full_name}
            className={inputCls}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="stage" className="text-sm font-medium">
            Stage
          </label>
          <select
            id="stage"
            name="stage"
            defaultValue={application.stage}
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
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={candidate.email ?? ""}
            className={inputCls}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="linkedin_url" className="text-sm font-medium">
            LinkedIn URL
          </label>
          <input
            id="linkedin_url"
            name="linkedin_url"
            type="url"
            defaultValue={candidate.linkedin_url ?? ""}
            className={inputCls}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="notes" className="text-sm font-medium">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={application.notes ?? ""}
          className={inputCls}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="resume_text" className="text-sm font-medium">
          CV / résumé text{" "}
          <span className="font-normal text-muted">(used by AI assessment)</span>
        </label>
        <textarea
          id="resume_text"
          name="resume_text"
          rows={6}
          defaultValue={candidate.resume_text ?? ""}
          className={inputCls}
        />
      </div>

      {state && "error" in state && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      )}
      {state && "ok" in state && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Saved.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
