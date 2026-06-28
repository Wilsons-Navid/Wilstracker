"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { uploadResume, removeResume } from "@/app/actions/resume";

const ACCEPT =
  ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export default function ResumeUpload({
  candidateId,
  hasFile,
  signedUrl,
}: {
  candidateId: string;
  hasFile: boolean;
  signedUrl: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function upload(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await uploadResume(candidateId, formData);
      if ("error" in res) {
        setError(res.error);
      } else {
        if (inputRef.current) inputRef.current.value = "";
        router.refresh();
      }
    });
  }

  function remove() {
    setError(null);
    startTransition(async () => {
      const res = await removeResume(candidateId);
      if ("error" in res) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-semibold">Résumé file</h2>
        <p className="text-xs text-muted">
          PDF, DOC, or DOCX · up to 5MB · stored privately.
        </p>
      </div>

      {hasFile ? (
        <div className="mb-4 flex items-center gap-3 rounded-lg bg-background px-3 py-2">
          <span className="text-sm">📄 Résumé on file</span>
          {signedUrl && (
            <a
              href={signedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-accent hover:underline"
            >
              View / download ↗
            </a>
          )}
          <button
            onClick={remove}
            disabled={pending}
            className="ml-auto inline-flex items-center gap-1 text-sm text-muted transition hover:text-red-600 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </button>
        </div>
      ) : (
        <p className="mb-4 rounded-lg bg-background px-3 py-2 text-sm text-muted">
          No résumé file uploaded yet.
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          upload(new FormData(e.currentTarget));
        }}
        className="flex flex-wrap items-center gap-3"
      >
        <input
          ref={inputRef}
          type="file"
          name="file"
          accept={ACCEPT}
          required
          className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-accent-fg hover:file:opacity-90"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-background disabled:opacity-50"
        >
          {pending ? "Uploading…" : hasFile ? "Replace" : "Upload"}
        </button>
      </form>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
