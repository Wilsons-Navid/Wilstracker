"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createJob, type JobFormState } from "@/app/actions/jobs";
import type { Profile, QuestionKind } from "@/lib/types";

// A question being drafted alongside the job, before it's saved.
type DraftQuestion = {
  prompt: string;
  kind: QuestionKind;
  required: boolean;
  options: string[];
};

const inputCls =
  "rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20";

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
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);

  useEffect(() => {
    if (state && "ok" in state) {
      formRef.current?.reset();
      setQuestions([]);
    }
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

      {/* Optional application questions, drafted here and saved with the job.
          Recruiters can add a few or skip the section entirely. */}
      <QuestionsSection questions={questions} setQuestions={setQuestions} />
      <input type="hidden" name="questions" value={JSON.stringify(questions)} />

      {state && "error" in state && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2.5 text-sm font-semibold text-accent-fg transition hover:opacity-90 disabled:opacity-60"
      >
        <Plus className="h-4 w-4" />
        {pending ? "Posting…" : "Post job"}
      </button>
    </form>
  );
}

function QuestionsSection({
  questions,
  setQuestions,
}: {
  questions: DraftQuestion[];
  setQuestions: React.Dispatch<React.SetStateAction<DraftQuestion[]>>;
}) {
  const [adding, setAdding] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [kind, setKind] = useState<QuestionKind>("text");
  const [required, setRequired] = useState(false);
  const [optionsText, setOptionsText] = useState("");
  const [error, setError] = useState<string | null>(null);

  function resetDraft() {
    setPrompt("");
    setKind("text");
    setRequired(false);
    setOptionsText("");
    setError(null);
  }

  function add() {
    const p = prompt.trim();
    if (!p) {
      setError("Question text is required.");
      return;
    }
    const options =
      kind === "choice"
        ? optionsText
            .split("\n")
            .map((o) => o.trim())
            .filter(Boolean)
        : [];
    if (kind === "choice" && options.length < 2) {
      setError("Add at least two choices (one per line).");
      return;
    }
    setQuestions((prev) => [...prev, { prompt: p, kind, required, options }]);
    resetDraft();
    setAdding(false);
  }

  function remove(index: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border p-4">
      <div>
        <h3 className="text-sm font-medium">
          Application questions{" "}
          <span className="font-normal text-muted">(optional)</span>
        </h3>
        <p className="text-xs text-muted">
          Extra questions applicants answer when they apply. You can also add or
          edit these later from the job&apos;s manage page.
        </p>
      </div>

      {questions.length > 0 && (
        <ul className="flex flex-col gap-2">
          {questions.map((q, i) => (
            <li
              key={i}
              className="flex items-start gap-3 rounded-lg border border-border bg-background px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{q.prompt}</span>
                  <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-muted">
                    {q.kind === "choice" ? "Choice" : "Text"}
                  </span>
                  {q.required && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                      Required
                    </span>
                  )}
                </div>
                {q.kind === "choice" && q.options.length > 0 && (
                  <p className="mt-1 text-xs text-muted">
                    {q.options.join(" · ")}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => remove(i)}
                className="inline-flex items-center gap-1 text-xs text-muted transition hover:text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* The draft sub-form is plain inputs (not a nested <form>, which HTML
          forbids) — "Add" just pushes into local state. */}
      {adding ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-background p-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Question</label>
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. How many years of React experience do you have?"
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Type</label>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as QuestionKind)}
                className={inputCls}
              >
                <option value="text">Free text</option>
                <option value="choice">Multiple choice</option>
              </select>
            </div>
            <label className="flex items-end gap-2 pb-2 text-sm">
              <input
                type="checkbox"
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              Required
            </label>
          </div>

          {kind === "choice" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">
                Choices{" "}
                <span className="font-normal text-muted">(one per line)</span>
              </label>
              <textarea
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                rows={4}
                placeholder={"0–1 years\n2–4 years\n5+ years"}
                className={inputCls}
              />
            </div>
          )}

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={add}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg hover:opacity-90"
            >
              Add question
            </button>
            <button
              type="button"
              onClick={() => {
                resetDraft();
                setAdding(false);
              }}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-surface"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1.5 self-start rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition hover:bg-background"
        >
          <Plus className="h-4 w-4" />
          Add question
        </button>
      )}
    </div>
  );
}
