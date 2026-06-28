import Link from "next/link";
import { LayoutGrid, Briefcase, Shield, LogOut } from "lucide-react";
import { requireStaff } from "@/lib/dal";
import { signOut } from "@/app/actions/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireStaff();
  const isAdmin = profile.role === "admin";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-surface/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
          <Link href="/board" className="flex items-center gap-2 font-semibold">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-sm font-bold text-accent-fg">
              W
            </span>
            WilsTracker
          </Link>

          <nav className="flex items-center gap-1 text-sm">
            <Link
              href="/board"
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-muted hover:bg-background hover:text-foreground"
            >
              <LayoutGrid className="h-4 w-4" />
              Board
            </Link>
            <Link
              href="/jobs"
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-muted hover:bg-background hover:text-foreground"
            >
              <Briefcase className="h-4 w-4" />
              Jobs
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-muted hover:bg-background hover:text-foreground"
              >
                <Shield className="h-4 w-4" />
                Admin
              </Link>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-medium leading-tight">
                {profile.full_name ?? "User"}
              </div>
              <div className="text-xs capitalize text-muted leading-tight">
                {profile.role}
              </div>
            </div>
            <form action={signOut}>
              <button className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted hover:bg-background hover:text-foreground">
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
