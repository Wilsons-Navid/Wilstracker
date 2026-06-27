"use client";

import { useActionState } from "react";
import { applyToJob, type ApplyState } from "@/app/actions/apply";

const inputCls =
  "rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20";

export default function ApplyForm({ jobId }: { jobId: string }) {
  const [state, action, pending] = useActionState<ApplyState, FormData>(
    applyToJob,
    undefined,
  );

  if (state && "ok" in state) {
    return (
      <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
        Thanks for applying. We have received your application and will be in
        touch by email.
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="job_id" value={jobId} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="full_name" className="text-sm font-medium">
            Full name
          </label>
          <input id="full_name" name="full_name" required className={inputCls} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className={inputCls}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="phone" className="text-sm font-medium">
            Phone <span className="font-normal text-muted">(optional)</span>
          </label>
          <input id="phone" name="phone" className={inputCls} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="linkedin_url" className="text-sm font-medium">
            LinkedIn <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            id="linkedin_url"
            name="linkedin_url"
            type="url"
            className={inputCls}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="resume_file" className="text-sm font-medium">
          Résumé <span className="font-normal text-muted">(PDF, DOC, or DOCX)</span>
        </label>
        <input
          id="resume_file"
          name="resume_file"
          type="file"
          accept=".pdf,.doc,.docx"
          className="text-sm"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="cover_letter" className="text-sm font-medium">
          Cover note <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea
          id="cover_letter"
          name="cover_letter"
          rows={5}
          className={inputCls}
          placeholder="Tell us why you're a fit for this role."
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
        className="self-start rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Submit application"}
      </button>
    </form>
  );
}
