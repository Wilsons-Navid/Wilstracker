import Link from "next/link";
import Logo from "@/components/ui/logo";

/**
 * Lightweight top bar for the public-facing pages (landing + careers). Kept
 * separate from the staff/portal chrome since visitors here have no session.
 */
export default function PublicHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4 sm:gap-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Logo mark className="h-8 w-8" />
          WilsTracker
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/careers"
            className="rounded-md px-3 py-1.5 text-muted hover:bg-background hover:text-foreground"
          >
            Open roles
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2 text-sm">
          <Link
            href="/login"
            className="rounded-md px-3 py-1.5 text-muted hover:bg-background hover:text-foreground"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-accent px-3 py-1.5 font-semibold text-accent-fg transition hover:opacity-90"
          >
            Sign up
          </Link>
        </div>
      </div>
    </header>
  );
}
