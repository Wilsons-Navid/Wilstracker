"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Briefcase, Shield } from "lucide-react";

const LINKS = [
  { href: "/board", label: "Board", Icon: LayoutGrid, adminOnly: false },
  { href: "/jobs", label: "Jobs", Icon: Briefcase, adminOnly: false },
  { href: "/admin", label: "Admin", Icon: Shield, adminOnly: true },
];

// Shared staff nav, used in both the desktop bar and the mobile menu. The active
// route gets the teal accent (text + soft pill + accent icon, via currentColor)
// so it's always clear where you are; everything else stays muted until hover.
export default function NavLinks({
  isAdmin,
  variant = "desktop",
}: {
  isAdmin: boolean;
  variant?: "desktop" | "mobile";
}) {
  const pathname = usePathname();
  const links = LINKS.filter((l) => !l.adminOnly || isAdmin);

  const base =
    variant === "desktop"
      ? "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5"
      : "flex items-center gap-2 rounded-md px-3 py-2 text-sm";

  return (
    <>
      {links.map((l) => {
        const active =
          pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`${base} ${
              active
                ? "bg-accent/10 font-medium text-accent"
                : "text-muted hover:bg-background hover:text-foreground"
            }`}
          >
            <l.Icon className="h-4 w-4" />
            {l.label}
          </Link>
        );
      })}
    </>
  );
}
