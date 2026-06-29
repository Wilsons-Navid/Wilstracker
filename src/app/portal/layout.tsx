import Link from "next/link";
import { requireCandidate } from "@/lib/dal";
import { signOut } from "@/app/actions/auth";
import MobileMenu from "@/components/ui/mobile-menu";
import Logo from "@/components/ui/logo";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const candidate = await requireCandidate();

  const navLinks = [
    { href: "/portal", label: "My applications" },
    { href: "/portal/profile", label: "Profile" },
    { href: "/careers", label: "Open roles" },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-surface/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4">
          <Link href="/portal" className="flex items-center gap-2 font-semibold">
            <Logo mark priority className="h-8 w-8 rounded-lg object-contain" />
            WilsTracker
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 text-sm md:flex">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-md px-3 py-1.5 text-muted hover:bg-background hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Desktop user + sign out */}
          <div className="ml-auto hidden items-center gap-3 md:flex">
            <div className="text-sm font-medium">{candidate.full_name}</div>
            <form action={signOut}>
              <button className="rounded-md border border-border px-3 py-1.5 text-sm text-muted hover:bg-background hover:text-foreground">
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
                  className="rounded-md px-3 py-2 text-sm text-muted hover:bg-background hover:text-foreground"
                >
                  {l.label}
                </Link>
              ))}
              <div className="my-1 border-t border-border" />
              <div className="px-3 py-1 text-sm font-medium">
                {candidate.full_name}
              </div>
              <form action={signOut}>
                <button className="w-full rounded-md px-3 py-2 text-left text-sm text-muted hover:bg-background hover:text-foreground">
                  Sign out
                </button>
              </form>
            </MobileMenu>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
