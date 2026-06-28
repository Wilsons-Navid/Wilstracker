"use client";

import { useActionState } from "react";
import { Send } from "lucide-react";
import { applyToJobAsCandidate, type ApplyState } from "@/app/actions/apply";
import type { JobQuestion } from "@/lib/types";

const inputCls =
  "rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20";

export default function CandidateApplyForm({
  jobId,
  fullName,
  email,
  hasResume,
  questions,
}: {
  jobId: string;
  fullName: string;
  email: string | null;
  hasResume: boolean;
  questions: JobQuestion[];
}) {
  const [state, action, pending] = useActionState<ApplyState, FormData>(
    applyToJobAsCandidate,
    undefined,
  );

  if (state && "ok" in state) {
    return (
      <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
        Thanks for applying. You can track this application from your portal, and
        we&apos;ll email you as it progresses.
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="job_id" value={jobId} />

      <p className="rounded-lg bg-background px-3 py-2 text-sm text-muted">
        Applying as <span className="font-medium text-foreground">{fullName}</span>
        {email ? ` (${email})` : ""}. Your profile and résumé are sent with this
        application.
      </p>

      {!hasResume && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="resume_file" className="text-sm font-medium">
            Résumé{" "}
            <span className="font-normal text-muted">(PDF, DOC, or DOCX)</span>
          </label>
          <input
            id="resume_file"
            name="resume_file"
            type="file"
            accept=".pdf,.doc,.docx"
            className="text-sm"
          />
          <span className="text-xs text-muted">
            You don&apos;t have a résumé on file yet. Adding one helps your
            application.
          </span>
        </div>
      )}

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

      {questions.map((q) => (
        <div key={q.id} className="flex flex-col gap-1.5">
          <label htmlFor={`answer_${q.id}`} className="text-sm font-medium">
            {q.prompt}{" "}
            {q.required ? (
              <span className="text-red-600">*</span>
            ) : (
              <span className="font-normal text-muted">(optional)</span>
            )}
          </label>

          {q.kind === "choice" ? (
            <div className="flex flex-col gap-1.5">
              {q.options.map((opt) => (
                <label key={opt} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name={`answer_${q.id}`}
                    value={opt}
                    required={q.required}
                    className="h-4 w-4 border-border"
                  />
                  {opt}
                </label>
              ))}
            </div>
          ) : (
            <textarea
              id={`answer_${q.id}`}
              name={`answer_${q.id}`}
              rows={3}
              required={q.required}
              className={inputCls}
            />
          )}
        </div>
      ))}

      {state && "error" in state && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-1.5 self-start rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg transition hover:opacity-90 disabled:opacity-60"
      >
        <Send className="h-4 w-4" />
        {pending ? "Submitting…" : "Submit application"}
      </button>
    </form>
  );
}
