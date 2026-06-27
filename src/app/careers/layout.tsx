import Link from "next/link";
import { getProfile } from "@/lib/dal";
import { signOut } from "@/app/actions/auth";
import PublicHeader from "@/components/public-header";

// Careers is a public route, but signed-in users browse it too (the portal links
// here). Show the public sign-in bar to visitors, and a slim "back to your area"
// bar to anyone already signed in so they keep their bearings.
export default async function CareersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col">
        <PublicHeader />
        <div className="flex-1">{children}</div>
      </div>
    );
  }

  const home = profile.role === "candidate" ? "/portal" : "/board";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-surface/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4">
          <Link href={home} className="flex items-center gap-2 font-semibold">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-sm font-bold text-accent-fg">
              W
            </span>
            WilsTracker
          </Link>
          <Link
            href={home}
            className="rounded-md px-3 py-1.5 text-sm text-muted hover:bg-background hover:text-foreground"
          >
            {profile.role === "candidate" ? "My applications" : "Back to board"}
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <div className="text-sm font-medium">{profile.full_name}</div>
            <form action={signOut}>
              <button className="rounded-md border border-border px-3 py-1.5 text-sm text-muted hover:bg-background hover:text-foreground">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
