"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assessCandidate } from "@/app/actions/ai";
import type { CvAssessment } from "@/lib/types";

function scoreColor(score: number | null) {
  if (score === null) return "text-muted";
  if (score >= 75) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-rose-600";
}

function RubricBar({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="font-medium">
          {value}
          <span className="text-muted">/{max}</span>
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-background">
        <div
          className="h-full rounded-full bg-accent"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function AssessmentPanel({
  candidateId,
  hasResume,
  latest,
}: {
  candidateId: string;
  hasResume: boolean;
  latest: CvAssessment | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const breakdown = (
    latest?.raw_json as {
      breakdown?: {
        skills_match: number;
        experience_match: number;
        domain_fit: number;
      };
    } | null
  )?.breakdown;

  function run() {
    setError(null);
    startTransition(async () => {
      const res = await assessCandidate(candidateId);
      if ("error" in res) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">AI CV assessment</h2>
          <p className="text-xs text-muted">
            Scores the CV against the attached job. Advisory only.
          </p>
        </div>
        <button
          onClick={run}
          disabled={pending || !hasResume}
          className="shrink-0 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-fg transition hover:opacity-90 disabled:opacity-50"
          title={hasResume ? "" : "Add a résumé first"}
        >
          {pending ? "Assessing…" : latest ? "Re-run" : "Run assessment"}
        </button>
      </div>

      {!hasResume && (
        <p className="rounded-lg bg-background px-3 py-2 text-sm text-muted">
          Upload a résumé file (PDF) or paste CV text below, then run the
          assessment.
        </p>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {latest && (
        <div className="flex flex-col gap-4">
          <div className="flex items-baseline gap-3">
            <span className={`text-3xl font-bold ${scoreColor(latest.score)}`}>
              {latest.score ?? "—"}
              <span className="text-base font-normal text-muted">/100</span>
            </span>
            <span className="rounded-full bg-background px-2.5 py-1 text-xs font-medium">
              {latest.recommendation}
            </span>
          </div>

          {breakdown && (
            <div className="flex flex-col gap-2.5">
              <RubricBar
                label="Skills match"
                value={breakdown.skills_match}
                max={50}
              />
              <RubricBar
                label="Experience"
                value={breakdown.experience_match}
                max={30}
              />
              <RubricBar
                label="Domain fit"
                value={breakdown.domain_fit}
                max={20}
              />
            </div>
          )}

          {latest.summary && <p className="text-sm">{latest.summary}</p>}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <h3 className="mb-1.5 text-xs font-semibold uppercase text-emerald-700">
                Strengths
              </h3>
              <ul className="flex flex-col gap-1 text-sm">
                {(latest.strengths ?? []).map((s, i) => (
                  <li key={i} className="flex gap-1.5">
                    <span className="text-emerald-600">+</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-1.5 text-xs font-semibold uppercase text-rose-700">
                Gaps
              </h3>
              <ul className="flex flex-col gap-1 text-sm">
                {(latest.gaps ?? []).map((g, i) => (
                  <li key={i} className="flex gap-1.5">
                    <span className="text-rose-600">−</span>
                    <span>{g}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="text-xs text-muted">
            Generated {new Date(latest.created_at).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
