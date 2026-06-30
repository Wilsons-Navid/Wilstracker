"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  STAGES,
  STAGE_LABELS,
  type PipelineCard,
  type CandidateStage,
  type Job,
} from "@/lib/types";
import { moveCandidateStage } from "@/app/actions/candidates";
import Avatar from "@/components/ui/avatar";

gsap.registerPlugin(useGSAP);

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// Per-stage colour so the pipeline reads at a glance: a dot, a tinted count
// chip, and a faint column wash. Full class strings (not interpolated) so
// Tailwind keeps them in the build.
const STAGE_STYLE: Record<
  CandidateStage,
  { dot: string; chip: string; tint: string }
> = {
  applied: { dot: "bg-slate-400", chip: "bg-slate-100 text-slate-600", tint: "bg-slate-50" },
  screening: { dot: "bg-blue-500", chip: "bg-blue-100 text-blue-700", tint: "bg-blue-50/60" },
  interview: { dot: "bg-amber-500", chip: "bg-amber-100 text-amber-700", tint: "bg-amber-50/60" },
  offer: { dot: "bg-violet-500", chip: "bg-violet-100 text-violet-700", tint: "bg-violet-50/60" },
  hired: { dot: "bg-emerald-500", chip: "bg-emerald-100 text-emerald-700", tint: "bg-emerald-50/60" },
  rejected: { dot: "bg-rose-500", chip: "bg-rose-100 text-rose-700", tint: "bg-rose-50/60" },
};

export default function Board({
  jobs,
  cards: initial,
  owners,
  initialCustomer,
}: {
  jobs: Job[];
  cards: PipelineCard[];
  // Job owners (customers), admin-only. When present, the customer filter shows.
  owners?: { id: string; name: string }[];
  // Optional customer id to pre-select the filter on load (e.g. deep-linked
  // from the admin customer view). Ignored if it isn't a known owner.
  initialCustomer?: string;
}) {
  const [candidates, setCandidates] = useState<PipelineCard[]>(initial);
  const [jobFilter, setJobFilter] = useState<string>("all");
  const [customerFilter, setCustomerFilter] = useState<string>(() =>
    initialCustomer && owners?.some((o) => o.id === initialCustomer)
      ? initialCustomer
      : "all",
  );
  const [nameFilter, setNameFilter] = useState<string>("");
  const [activeId, setActiveId] = useState<string | null>(null);
  // The card that just changed stage, with a bumping nonce so repeated moves of
  // the same card still re-trigger the landing animation.
  const [moved, setMoved] = useState<{ id: string; n: number } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  // Mouse drags start after a small move; touch needs a short press-hold so a
  // finger swipe still scrolls the board horizontally instead of grabbing a card.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
  );

  // Stagger the cards in once on load.
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from(".kanban-card", {
        opacity: 0,
        y: 8,
        duration: 0.3,
        ease: "power2.out",
        stagger: 0.02,
      });
    },
    { scope: boardRef },
  );

  // Pop and flash the card that just landed in a new column.
  useGSAP(
    () => {
      if (!moved || prefersReducedMotion()) return;
      const sel = `[data-card-id="${moved.id}"]`;
      gsap.fromTo(
        sel,
        { scale: 0.92 },
        { scale: 1, duration: 0.4, ease: "back.out(2)" },
      );
      gsap.fromTo(
        sel,
        { boxShadow: "0 0 0 2px var(--accent)" },
        { boxShadow: "0 0 0 0px rgba(0,0,0,0)", duration: 0.6, ease: "power2.out" },
      );
    },
    { scope: boardRef, dependencies: [moved?.n] },
  );

  const jobTitle = useMemo(
    () => Object.fromEntries(jobs.map((j) => [j.id, j.title])),
    [jobs],
  );

  // job_id -> owner_id, so a card can be matched to its customer.
  const ownerByJob = useMemo(
    () => Object.fromEntries(jobs.map((j) => [j.id, j.owner_id])),
    [jobs],
  );

  // When a customer is selected, only their jobs stay in the job dropdown.
  const visibleJobs = useMemo(
    () =>
      customerFilter === "all"
        ? jobs
        : jobs.filter((j) => j.owner_id === customerFilter),
    [jobs, customerFilter],
  );

  const filtered = useMemo(() => {
    const q = nameFilter.trim().toLowerCase();
    return candidates.filter((c) => {
      if (jobFilter !== "all" && c.job_id !== jobFilter) return false;
      if (
        customerFilter !== "all" &&
        (!c.job_id || ownerByJob[c.job_id] !== customerFilter)
      )
        return false;
      if (q && !c.full_name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [candidates, jobFilter, customerFilter, ownerByJob, nameFilter]);

  const byStage = useMemo(() => {
    const map: Record<CandidateStage, PipelineCard[]> = {
      applied: [],
      screening: [],
      interview: [],
      offer: [],
      hired: [],
      rejected: [],
    };
    for (const c of filtered) map[c.stage].push(c);
    return map;
  }, [filtered]);

  const activeCandidate = candidates.find((c) => c.id === activeId) ?? null;

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  async function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const id = String(e.active.id);
    const overStage = e.over?.id as CandidateStage | undefined;
    if (!overStage) return;

    const current = candidates.find((c) => c.id === id);
    if (!current || current.stage === overStage) return;

    const previous = current.stage;
    // Optimistic update, and flag the card so it animates into its new column.
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, stage: overStage } : c)),
    );
    setMoved((m) => ({ id, n: (m?.n ?? 0) + 1 }));

    const res = await moveCandidateStage(id, overStage);
    if (res.error) {
      // Revert on failure
      setCandidates((prev) =>
        prev.map((c) => (c.id === id ? { ...c, stage: previous } : c)),
      );
    }
  }

  return (
    <div ref={boardRef} className="flex h-full flex-col gap-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        {owners && owners.length > 0 && (
          <select
            value={customerFilter}
            onChange={(e) => {
              setCustomerFilter(e.target.value);
              // Drop the job filter if it no longer belongs to this customer.
              setJobFilter("all");
            }}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent sm:w-auto"
          >
            <option value="all">All customers</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        )}

        <select
          value={jobFilter}
          onChange={(e) => setJobFilter(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent sm:w-auto"
        >
          <option value="all">All jobs</option>
          {visibleJobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.title}
            </option>
          ))}
        </select>

        <input
          type="search"
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
          placeholder="Filter by candidate name…"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent sm:w-64"
        />

        <span className="text-sm text-muted">
          {filtered.length} candidate{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Board */}
      <DndContext
        id="kanban-board"
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STAGES.map((stage) => (
            <Column
              key={stage}
              stage={stage}
              count={byStage[stage].length}
            >
              {byStage[stage].map((c) => (
                <CandidateCard
                  key={c.id}
                  candidate={c}
                  jobTitle={c.job_id ? jobTitle[c.job_id] : undefined}
                />
              ))}
            </Column>
          ))}
        </div>

        <DragOverlay>
          {activeCandidate ? (
            <CardShell
              candidate={activeCandidate}
              jobTitle={
                activeCandidate.job_id
                  ? jobTitle[activeCandidate.job_id]
                  : undefined
              }
              dragging
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function Column({
  stage,
  count,
  children,
}: {
  stage: CandidateStage;
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const s = STAGE_STYLE[stage];
  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
        <span className="text-sm font-medium">{STAGE_LABELS[stage]}</span>
        <span
          className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold ${s.chip}`}
        >
          {count}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-32 flex-1 flex-col gap-2 rounded-xl border p-2 transition ${
          isOver ? "border-accent bg-accent/10" : `border-border ${s.tint}`
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function CandidateCard({
  candidate,
  jobTitle,
}: {
  candidate: PipelineCard;
  jobTitle?: string;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: candidate.id,
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      data-card-id={candidate.id}
      className={`kanban-card ${isDragging ? "opacity-40" : ""}`}
    >
      <CardShell candidate={candidate} jobTitle={jobTitle} />
    </div>
  );
}

// Traffic-light colours for the AI score, matching the assessment panel.
function scoreClasses(score: number): string {
  if (score >= 75) return "bg-emerald-50 text-emerald-700";
  if (score >= 50) return "bg-amber-50 text-amber-700";
  return "bg-rose-50 text-rose-700";
}

function CardShell({
  candidate,
  jobTitle,
  dragging,
}: {
  candidate: PipelineCard;
  jobTitle?: string;
  dragging?: boolean;
}) {
  return (
    <div
      className={`cursor-grab rounded-lg border border-border bg-surface p-3 shadow-sm active:cursor-grabbing ${
        dragging ? "rotate-1 shadow-md" : ""
      }`}
    >
      <div className="flex items-start gap-2.5">
        <Avatar
          name={candidate.full_name}
          photoUrl={candidate.avatar_url}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <Link
              href={`/candidates/${candidate.id}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="text-sm font-medium leading-tight hover:text-accent hover:underline"
            >
              {candidate.full_name}
            </Link>
            <div className="flex shrink-0 items-center gap-1.5">
              {candidate.score != null && (
                <span
                  title="AI assessment score"
                  className={`rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums ${scoreClasses(candidate.score)}`}
                >
                  {candidate.score}
                </span>
              )}
              {candidate.linkedin_url && (
                <a
                  href={candidate.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs font-medium text-accent hover:underline"
                >
                  in ↗
                </a>
              )}
            </div>
          </div>
          {jobTitle && (
            <div className="mt-1.5">
              <span className="inline-block rounded bg-background px-1.5 py-0.5 text-xs text-muted">
                {jobTitle}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
