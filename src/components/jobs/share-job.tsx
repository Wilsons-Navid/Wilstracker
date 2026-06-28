"use client";

import { useState } from "react";
import { Mail, Copy, Check } from "lucide-react";
import {
  XIcon,
  LinkedInIcon,
  FacebookIcon,
  WhatsAppIcon,
  TelegramIcon,
} from "@/components/ui/brand-icons";

// Style A: white buttons, brand-colored logos, neutral labels. The absolute URL
// is computed server-side and passed in (no browser-only effect).
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

  const iconCls = "h-4 w-4 shrink-0";
  const targets: { label: string; href: string; icon: React.ReactNode }[] = [
    {
      label: "X",
      href: `https://twitter.com/intent/tweet?text=${e(text)}&url=${e(url)}`,
      icon: <XIcon className={iconCls} />,
    },
    {
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${e(url)}`,
      icon: <LinkedInIcon className={iconCls} />,
    },
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${e(url)}`,
      icon: <FacebookIcon className={iconCls} />,
    },
    {
      label: "WhatsApp",
      href: `https://wa.me/?text=${e(`${text} ${url}`)}`,
      icon: <WhatsAppIcon className={iconCls} />,
    },
    {
      label: "Telegram",
      href: `https://t.me/share/url?url=${e(url)}&text=${e(text)}`,
      icon: <TelegramIcon className={iconCls} />,
    },
    {
      label: "Email",
      href: `mailto:?subject=${e(title)}&body=${e(`${text}\n${url}`)}`,
      icon: <Mail className={`${iconCls} text-muted`} />,
    },
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

  const btnCls =
    "inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-background hover:shadow-sm";

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
            className={btnCls}
          >
            {t.icon}
            {t.label}
          </a>
        ))}
        <button onClick={copy} type="button" className={btnCls}>
          {copied ? (
            <Check className={`${iconCls} text-emerald-600`} />
          ) : (
            <Copy className={`${iconCls} text-muted`} />
          )}
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>

      <p className="mt-3 truncate rounded-lg bg-background px-3 py-2 text-xs text-muted">
        {url}
      </p>
    </div>
  );
}
