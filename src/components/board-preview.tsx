"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

// A static, decorative preview of the pipeline board. It mirrors the stage
// colours used in the real Kanban, and a looping highlight travels across the
// columns so the landing shows a candidate moving through the pipeline rather
// than just a still image.
const PREVIEW_STAGES = [
  { label: "Applied", dot: "bg-slate-400", chip: "bg-slate-100 text-slate-600", count: 2, cards: 2 },
  { label: "Screening", dot: "bg-blue-500", chip: "bg-blue-100 text-blue-700", count: 3, cards: 2 },
  { label: "Interview", dot: "bg-amber-500", chip: "bg-amber-100 text-amber-700", count: 2, cards: 1 },
  { label: "Offer", dot: "bg-violet-500", chip: "bg-violet-100 text-violet-700", count: 1, cards: 1 },
];

export default function BoardPreview() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        return;
      }

      const actives = gsap.utils.toArray<HTMLElement>(".preview-active");
      if (!actives.length) return;

      // Light up each column's top card in turn, then move on, on a loop.
      const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.6 });
      actives.forEach((el) => {
        tl.to(el, {
          boxShadow: "0 0 0 2px var(--accent)",
          scale: 1.04,
          duration: 0.3,
          ease: "power2.out",
        })
          .to(el, {}, "+=0.5")
          .to(el, {
            boxShadow: "0 0 0 0px rgba(0,0,0,0)",
            scale: 1,
            duration: 0.3,
            ease: "power2.in",
          });
      });
    },
    { scope: root },
  );

  return (
    <div
      aria-hidden
      ref={root}
      className="mt-16 w-full max-w-3xl rounded-2xl border border-border bg-surface/70 p-4 text-left shadow-sm backdrop-blur"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {PREVIEW_STAGES.map((s) => (
          <div key={s.label} className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 px-0.5">
              <span className={`h-2 w-2 rounded-full ${s.dot}`} />
              <span className="text-xs font-medium">{s.label}</span>
              <span
                className={`ml-auto rounded-full px-1.5 text-[10px] font-semibold ${s.chip}`}
              >
                {s.count}
              </span>
            </div>
            {Array.from({ length: s.cards }).map((_, i) => (
              <div
                key={i}
                className={`rounded-lg border border-border bg-background/70 p-2.5 ${
                  i === 0 ? "preview-active" : ""
                }`}
              >
                <div className="h-2 w-2/3 rounded bg-muted/30" />
                <div className="mt-1.5 h-2 w-1/3 rounded bg-muted/20" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
