"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
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
  type Candidate,
  type CandidateStage,
  type Job,
} from "@/lib/types";
import { moveCandidateStage } from "@/app/actions/candidates";
import Avatar from "@/components/ui/avatar";

const STAGE_ACCENT: Record<CandidateStage, string> = {
  applied: "bg-slate-400",
  screening: "bg-blue-500",
  interview: "bg-violet-500",
  offer: "bg-amber-500",
  hired: "bg-emerald-500",
  rejected: "bg-rose-500",
};

export default function Board({
  jobs,
  candidates: initial,
}: {
  jobs: Job[];
  candidates: Candidate[];
}) {
  const [candidates, setCandidates] = useState<Candidate[]>(initial);
  const [jobFilter, setJobFilter] = useState<string>("all");
  const [nameFilter, setNameFilter] = useState<string>("");
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const jobTitle = useMemo(
    () => Object.fromEntries(jobs.map((j) => [j.id, j.title])),
    [jobs],
  );

  const filtered = useMemo(() => {
    const q = nameFilter.trim().toLowerCase();
    return candidates.filter((c) => {
      if (jobFilter !== "all" && c.job_id !== jobFilter) return false;
      if (q && !c.full_name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [candidates, jobFilter, nameFilter]);

  const byStage = useMemo(() => {
    const map: Record<CandidateStage, Candidate[]> = {
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
    // Optimistic update
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, stage: overStage } : c)),
    );

    const res = await moveCandidateStage(id, overStage);
    if (res.error) {
      // Revert on failure
      setCandidates((prev) =>
        prev.map((c) => (c.id === id ? { ...c, stage: previous } : c)),
      );
    }
  }

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={jobFilter}
          onChange={(e) => setJobFilter(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
        >
          <option value="all">All jobs</option>
          {jobs.map((j) => (
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
          className="w-64 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
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
  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className={`h-2 w-2 rounded-full ${STAGE_ACCENT[stage]}`} />
        <span className="text-sm font-medium">{STAGE_LABELS[stage]}</span>
        <span className="ml-auto rounded-full bg-background px-2 text-xs text-muted">
          {count}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-32 flex-1 flex-col gap-2 rounded-xl border border-dashed p-2 transition ${
          isOver ? "border-accent bg-accent/5" : "border-border bg-surface/40"
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
  candidate: Candidate;
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
      className={isDragging ? "opacity-40" : ""}
    >
      <CardShell candidate={candidate} jobTitle={jobTitle} />
    </div>
  );
}

function CardShell({
  candidate,
  jobTitle,
  dragging,
}: {
  candidate: Candidate;
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
            {candidate.linkedin_url && (
              <a
                href={candidate.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                className="shrink-0 text-xs font-medium text-accent hover:underline"
              >
                in ↗
              </a>
            )}
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
