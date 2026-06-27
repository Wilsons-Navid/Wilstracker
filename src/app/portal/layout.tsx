import Link from "next/link";
import { requireCandidate } from "@/lib/dal";
import { signOut } from "@/app/actions/auth";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const candidate = await requireCandidate();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-surface/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4">
          <Link href="/portal" className="flex items-center gap-2 font-semibold">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-sm font-bold text-accent-fg">
              W
            </span>
            WilsTracker
          </Link>

          <nav className="flex items-center gap-1 text-sm">
            <Link
              href="/portal"
              className="rounded-md px-3 py-1.5 text-muted hover:bg-background hover:text-foreground"
            >
              My applications
            </Link>
            <Link
              href="/portal/profile"
              className="rounded-md px-3 py-1.5 text-muted hover:bg-background hover:text-foreground"
            >
              Profile
            </Link>
            <Link
              href="/careers"
              className="rounded-md px-3 py-1.5 text-muted hover:bg-background hover:text-foreground"
            >
              Open roles
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <div className="text-sm font-medium">{candidate.full_name}</div>
            <form action={signOut}>
              <button className="rounded-md border border-border px-3 py-1.5 text-sm text-muted hover:bg-background hover:text-foreground">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
