import Link from "next/link";
import { LayoutGrid, Briefcase, Shield, LogOut } from "lucide-react";
import { requireStaff } from "@/lib/dal";
import { signOut } from "@/app/actions/auth";
import MobileMenu from "@/components/ui/mobile-menu";
import Logo from "@/components/ui/logo";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireStaff();
  const isAdmin = profile.role === "admin";

  const navLinks = [
    { href: "/board", label: "Board", icon: <LayoutGrid className="h-4 w-4" /> },
    { href: "/jobs", label: "Jobs", icon: <Briefcase className="h-4 w-4" /> },
    ...(isAdmin
      ? [{ href: "/admin", label: "Admin", icon: <Shield className="h-4 w-4" /> }]
      : []),
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-surface/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
          <Link href="/board" className="flex items-center gap-2 font-semibold">
            <Logo mark priority className="h-8 w-8 rounded-lg object-contain" />
            WilsTracker
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 text-sm md:flex">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-muted hover:bg-background hover:text-foreground"
              >
                {l.icon}
                {l.label}
              </Link>
            ))}
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
              <button className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted hover:bg-background hover:text-foreground">
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </form>
          </div>

          {/* Mobile menu */}
          <div className="ml-auto md:hidden">
            <MobileMenu>
              {navLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted hover:bg-background hover:text-foreground"
                >
                  {l.icon}
                  {l.label}
                </Link>
              ))}
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
                <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted hover:bg-background hover:text-foreground">
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
