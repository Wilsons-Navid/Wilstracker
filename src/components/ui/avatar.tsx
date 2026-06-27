"use client";

import { useState } from "react";

/**
 * Candidate avatar: shows the photo if a valid `photoUrl` is given, otherwise
 * falls back to deterministic colored initials derived from the name. If the
 * photo fails to load (broken link), it also falls back to initials — so every
 * candidate always has a visible profile picture.
 */

const COLORS = [
  "bg-rose-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-teal-500",
  "bg-cyan-500",
  "bg-blue-500",
  "bg-indigo-500",
  "bg-violet-500",
  "bg-fuchsia-500",
  "bg-pink-500",
  "bg-slate-500",
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return COLORS[hash % COLORS.length];
}

const SIZES = {
  sm: "h-9 w-9 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-xl",
} as const;

export default function Avatar({
  name,
  photoUrl,
  size = "md",
}: {
  name: string;
  photoUrl?: string | null;
  size?: keyof typeof SIZES;
}) {
  const [broken, setBroken] = useState(false);
  const dimensions = SIZES[size];

  if (photoUrl && !broken) {
    return (
      // Arbitrary user-supplied URLs — plain <img> avoids next/image domain config.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={name}
        onError={() => setBroken(true)}
        className={`${dimensions} shrink-0 rounded-full border border-border object-cover`}
      />
    );
  }

  return (
    <span
      aria-label={name}
      className={`${dimensions} ${colorFor(
        name,
      )} inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white`}
    >
      {getInitials(name)}
    </span>
  );
}
