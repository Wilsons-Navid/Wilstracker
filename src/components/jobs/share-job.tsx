"use client";

import { useState } from "react";

// Share a public job link to social platforms. The absolute URL is computed on
// the server (from the request host) and passed in, so there's no browser-only
// effect and the share targets work in dev and prod alike.
export default function ShareJob({
  url,
  title,
}: {
  url: string;
  title: string;
}) {
  const [copied, setCopied] = useState(false);

  const text = `Check out this role: ${title}`;
  const e = encodeURIComponent;

  const targets: { label: string; href: string }[] = [
    { label: "X", href: `https://twitter.com/intent/tweet?text=${e(text)}&url=${e(url)}` },
    {
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${e(url)}`,
    },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${e(url)}` },
    { label: "WhatsApp", href: `https://wa.me/?text=${e(`${text} ${url}`)}` },
    { label: "Telegram", href: `https://t.me/share/url?url=${e(url)}&text=${e(text)}` },
    { label: "Email", href: `mailto:?subject=${e(title)}&body=${e(`${text}\n${url}`)}` },
  ];

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked; the link is visible below as a fallback.
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <h2 className="text-base font-semibold">Share this job</h2>
      <p className="mb-4 text-xs text-muted">
        Post the public application link anywhere candidates are.
      </p>

      <div className="flex flex-wrap gap-2">
        {targets.map((t) => (
          <a
            key={t.label}
            href={t.href}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-background"
          >
            {t.label}
          </a>
        ))}
        <button
          onClick={copy}
          type="button"
          className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-background"
        >
          {copied ? "Copied ✓" : "Copy link"}
        </button>
      </div>

      <p className="mt-3 truncate rounded-lg bg-background px-3 py-2 text-xs text-muted">
        {url}
      </p>
    </div>
  );
}
