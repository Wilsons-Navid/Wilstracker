import Link from "next/link";
import { LogOut } from "lucide-react";
import { requireStaff } from "@/lib/dal";
import { signOut } from "@/app/actions/auth";
import MobileMenu from "@/components/ui/mobile-menu";
import NavLinks from "@/components/ui/nav-links";
import Logo from "@/components/ui/logo";

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
            <Logo mark className="h-8 w-8" />
            WilsTracker
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 text-sm md:flex">
            <NavLinks isAdmin={isAdmin} variant="desktop" />
          </nav>

          {/* Desktop user + sign out */}
          <div className="ml-auto hidden items-center gap-3 md:flex">
            <div className="text-right">
              <div className="text-sm font-medium leading-tight">
                {profile.full_name ?? "User"}
              </div>
              <div className="text-xs capitalize text-muted leading-tight">
                {profile.role}
              </div>
            </div>
            <form action={signOut}>
              <button className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600">
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </form>
          </div>

          {/* Mobile menu */}
          <div className="ml-auto md:hidden">
            <MobileMenu>
              <NavLinks isAdmin={isAdmin} variant="mobile" />
              <div className="my-1 border-t border-border" />
              <div className="px-3 py-1">
                <div className="text-sm font-medium leading-tight">
                  {profile.full_name ?? "User"}
                </div>
                <div className="text-xs capitalize text-muted leading-tight">
                  {profile.role}
                </div>
              </div>
              <form action={signOut}>
                <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted transition hover:bg-rose-50 hover:text-rose-600">
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </form>
            </MobileMenu>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
