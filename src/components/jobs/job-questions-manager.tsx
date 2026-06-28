"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import {
  addJobQuestion,
  updateJobQuestion,
  deleteJobQuestion,
} from "@/app/actions/job-questions";
import type { JobQuestion, QuestionKind } from "@/lib/types";

const inputCls =
  "rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20";

// Shared prompt/kind/options/required fields for both the add and edit forms.
function QuestionFields({ question }: { question?: JobQuestion }) {
  const [kind, setKind] = useState<QuestionKind>(question?.kind ?? "text");

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Question</label>
        <input
          name="prompt"
          required
          defaultValue={question?.prompt ?? ""}
          placeholder="e.g. How many years of React experience do you have?"
          className={inputCls}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Type</label>
          <select
            name="kind"
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
            name="required"
            defaultChecked={question?.required ?? false}
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
            name="options"
            rows={4}
            defaultValue={(question?.options ?? []).join("\n")}
            placeholder={"0–1 years\n2–4 years\n5+ years"}
            className={inputCls}
          />
        </div>
      )}
    </>
  );
}

function AddQuestion({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    start(async () => {
      const res = await addJobQuestion(undefined, formData);
      if (res && "error" in res) {
        setError(res.error);
      } else {
        setOpen(false);
        router.refresh();
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-background"
      >
        + Add question
      </button>
    );
  }

  return (
    <form
      action={submit}
      className="flex flex-col gap-4 rounded-xl border border-border bg-background p-4"
    >
      <input type="hidden" name="job_id" value={jobId} />
      <QuestionFields />

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Adding…" : "Add question"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-surface"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function QuestionRow({ question }: { question: JobQuestion }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const [deleting, startDelete] = useTransition();

  function save(formData: FormData) {
    setError(null);
    startSave(async () => {
      const res = await updateJobQuestion(undefined, formData);
      if (res && "error" in res) {
        setError(res.error);
      } else {
        setEditing(false);
        router.refresh();
      }
    });
  }

  function remove() {
    startDelete(async () => {
      await deleteJobQuestion(question.id, question.job_id);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <form
        action={save}
        className="flex flex-col gap-4 rounded-xl border border-border bg-background p-4"
      >
        <input type="hidden" name="question_id" value={question.id} />
        <input type="hidden" name="job_id" value={question.job_id} />
        <QuestionFields question={question} />

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-surface"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <li className="flex items-start gap-3 rounded-xl border border-border bg-background px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{question.prompt}</span>
          <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-muted">
            {question.kind === "choice" ? "Choice" : "Text"}
          </span>
          {question.required && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
              Required
            </span>
          )}
        </div>
        {question.kind === "choice" && question.options.length > 0 && (
          <p className="mt-1 text-xs text-muted">
            {question.options.join(" · ")}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="inline-flex items-center gap-1 text-sm text-muted transition hover:text-foreground"
      >
        <Pencil className="h-3.5 w-3.5" />
        Edit
      </button>
      <button
        type="button"
        onClick={remove}
        disabled={deleting}
        className="inline-flex items-center gap-1 text-sm text-muted transition hover:text-red-600 disabled:opacity-50"
      >
        <Trash2 className="h-3.5 w-3.5" />
        {deleting ? "…" : "Delete"}
      </button>
    </li>
  );
}

export default function JobQuestionsManager({
  jobId,
  questions,
}: {
  jobId: string;
  questions: JobQuestion[];
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div>
        <h2 className="text-base font-semibold">Application questions</h2>
        <p className="text-xs text-muted">
          Extra questions applicants answer when they apply. Answers show on each
          candidate&apos;s detail page.
        </p>
      </div>

      {questions.length === 0 ? (
        <p className="text-sm text-muted">No extra questions yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {questions.map((q) => (
            <QuestionRow key={q.id} question={q} />
          ))}
        </ul>
      )}

      <AddQuestion jobId={jobId} />
    </div>
  );
}
