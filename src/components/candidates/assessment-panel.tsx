"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { assessCandidate } from "@/app/actions/ai";
import type { CvAssessment } from "@/lib/types";

gsap.registerPlugin(useGSAP);

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

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
          className="rubric-fill h-full rounded-full bg-accent"
          data-pct={pct}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function AssessmentPanel({
  applicationId,
  hasResume,
  latest,
}: {
  applicationId: string;
  hasResume: boolean;
  latest: CvAssessment | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const scoreRef = useRef<HTMLSpanElement>(null);

  // When an assessment renders, count the score up from zero and grow the
  // rubric bars to their values. Re-runs when a fresh assessment arrives.
  useGSAP(
    () => {
      if (!latest || prefersReducedMotion()) return;

      if (scoreRef.current && latest.score != null) {
        const counter = { v: 0 };
        const target = latest.score;
        gsap.to(counter, {
          v: target,
          duration: 0.9,
          ease: "power2.out",
          onUpdate: () => {
            if (scoreRef.current) {
              scoreRef.current.textContent = String(Math.round(counter.v));
            }
          },
        });
      }

      gsap.fromTo(
        ".rubric-fill",
        { width: 0 },
        {
          width: (_i, t) => `${(t as HTMLElement).dataset.pct}%`,
          duration: 0.8,
          ease: "power2.out",
          stagger: 0.08,
        },
      );
    },
    { scope: resultsRef, dependencies: [latest?.id] },
  );

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
      const res = await assessCandidate(applicationId);
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
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-fg transition hover:opacity-90 disabled:opacity-50"
          title={hasResume ? "" : "Add a résumé first"}
        >
          <Sparkles className="h-4 w-4" />
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
        <div ref={resultsRef} className="flex flex-col gap-4">
          <div className="flex items-baseline gap-3">
            <span className={`text-3xl font-bold ${scoreColor(latest.score)}`}>
              <span ref={scoreRef}>{latest.score ?? "—"}</span>
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
