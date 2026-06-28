"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { uploadAvatar, removeAvatar } from "@/app/actions/avatar";
import Avatar from "@/components/ui/avatar";

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

export default function AvatarUpload({
  candidateId,
  name,
  avatarUrl,
}: {
  candidateId: string;
  name: string;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function upload(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await uploadAvatar(candidateId, formData);
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
      const res = await removeAvatar(candidateId);
      if ("error" in res) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-semibold">Profile photo</h2>
        <p className="text-xs text-muted">
          PNG, JPG, WEBP, or GIF · up to 2MB. Initials are shown until a photo is
          uploaded.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <Avatar name={name} photoUrl={avatarUrl} size="lg" />

        <div className="flex flex-col gap-2">
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
              {pending ? "Uploading…" : avatarUrl ? "Replace" : "Upload"}
            </button>
          </form>

          {avatarUrl && (
            <button
              onClick={remove}
              disabled={pending}
              className="inline-flex items-center gap-1 self-start text-sm text-muted transition hover:text-red-600 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove photo
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
