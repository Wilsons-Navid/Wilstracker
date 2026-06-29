import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/dal";
import PublicHeader from "@/components/public-header";
import BoardPreview from "@/components/board-preview";

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

      <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 pb-20 pt-16 text-center">
        {/* Engineered dot-grid backdrop, faded from the top. */}
        <div
          aria-hidden
          className="hero-grid pointer-events-none absolute inset-0 -z-10"
        />

        <span className="rise-in rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
          Applicant tracking, made simple
        </span>
        <h1
          className="rise-in mt-5 max-w-2xl text-4xl font-semibold leading-tight sm:text-5xl"
          style={{ animationDelay: "60ms" }}
        >
          Find your next role, and track it the whole way through.
        </h1>
        <p
          className="rise-in mt-4 max-w-xl text-base text-muted"
          style={{ animationDelay: "120ms" }}
        >
          Browse open roles, apply in minutes, and follow every application from
          screening to offer.
        </p>

        <div
          className="rise-in mt-8 flex flex-wrap items-center justify-center gap-3"
          style={{ animationDelay: "180ms" }}
        >
          <Link
            href="/careers"
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg transition hover:opacity-90 active:translate-y-px"
          >
            View open roles
          </Link>
          <Link
            href="/signup"
            className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold transition hover:bg-surface active:translate-y-px"
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
