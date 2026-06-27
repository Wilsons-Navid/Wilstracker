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

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
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
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted">
        WilsTracker
      </footer>
    </div>
  );
}
