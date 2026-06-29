"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { RefreshCw, Copy, Check } from "lucide-react";
import { setAccountPassword } from "@/app/actions/admin";

// Ambiguous characters (0/O, 1/l/I) are left out so a typed/dictated temp
// password is hard to get wrong.
const ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generatePassword(length = 14): string {
  const values = crypto.getRandomValues(new Uint32Array(length));
  let out = "";
  for (const n of values) out += ALPHABET[n % ALPHABET.length];
  return out;
}

export default function ResetPasswordDialog({
  userId,
  name,
  onClose,
}: {
  userId: string;
  name: string;
  onClose: () => void;
}) {
  const [password, setPassword] = useState(generatePassword);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);

  async function submit() {
    setError(null);
    setPending(true);
    const res = await setAccountPassword(userId, password);
    setPending(false);
    if (res.error) setError(res.error);
    else setDone(true);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked; the value is visible to copy by hand.
    }
  }

  const node = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold">Reset password</h2>

        {done ? (
          <>
            <p className="mt-2 text-sm text-muted">
              New password set for{" "}
              <span className="font-medium text-foreground">{name}</span>. Share
              it with them. They can change it later from{" "}
              <span className="whitespace-nowrap">&ldquo;Forgot password&rdquo;</span>.
            </p>
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
              <code className="flex-1 break-all text-sm">{password}</code>
              <button
                type="button"
                onClick={copy}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted hover:text-foreground"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg hover:opacity-90"
              >
                Done
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted">
              Set a new password for{" "}
              <span className="font-medium text-foreground">{name}</span>. The
              current password is replaced immediately.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-1 rounded-lg border border-border px-3 py-2 font-mono text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
              <button
                type="button"
                onClick={() => setPassword(generatePassword())}
                title="Generate a new one"
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-2 text-xs text-muted hover:bg-background"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>

            {error && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={pending}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-background disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={pending || password.length < 8}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg hover:opacity-90 disabled:opacity-50"
              >
                {pending ? "Setting…" : "Set password"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(node, document.body);
}
