import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/dal";
import PublicHeader from "@/components/public-header";

// The site's front door. Role-aware: signed-in staff go to the board, signed-in
// candidates to their portal, and everyone else sees the public landing.
export default async function HomePage() {
  const profile = await getProfile();
  if (profile) {
    redirect(profile.role === "candidate" ? "/portal" : "/board");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />

      <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-20 text-center">
        {/* Soft accent glow behind the hero. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-[-10%] h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl" />
        </div>

        <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
          Applicant tracking, made simple
        </span>
        <h1 className="mt-5 max-w-2xl text-4xl font-semibold leading-tight sm:text-5xl">
          Find your next role, and track it the whole way through.
        </h1>
        <p className="mt-4 max-w-xl text-base text-muted">
          Browse open positions, apply in a couple of minutes, and follow every
          application from screening to offer in one place.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/careers"
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg transition hover:opacity-90"
          >
            View open roles
          </Link>
          <Link
            href="/signup"
            className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold transition hover:bg-surface"
          >
            Create an account
          </Link>
        </div>

        <p className="mt-6 text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-accent hover:underline">
            Sign in
          </Link>
        </p>

        <BoardPreview />
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted">
        WilsTracker
      </footer>
    </div>
  );
}

// A static, decorative preview of the pipeline board. It mirrors the stage
// colours used in the real Kanban so the landing shows the product rather than
// just describing it.
const PREVIEW_STAGES = [
  { label: "Applied", dot: "bg-slate-400", chip: "bg-slate-100 text-slate-600", count: 2, cards: 2 },
  { label: "Screening", dot: "bg-blue-500", chip: "bg-blue-100 text-blue-700", count: 3, cards: 2 },
  { label: "Interview", dot: "bg-amber-500", chip: "bg-amber-100 text-amber-700", count: 2, cards: 1 },
  { label: "Offer", dot: "bg-violet-500", chip: "bg-violet-100 text-violet-700", count: 1, cards: 1 },
];

function BoardPreview() {
  return (
    <div
      aria-hidden
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
                className="rounded-lg border border-border bg-background/70 p-2.5"
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
