"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";

/**
 * Hamburger trigger + dropdown panel for small screens. The header renders its
 * nav links / user actions as children; tapping anything in the panel (or the
 * backdrop) closes it. Hidden on md+ where the full inline nav is shown instead.
 */
export default function MobileMenu({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted hover:bg-background hover:text-foreground"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <>
          {/* Tap-away backdrop. */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div
            onClick={() => setOpen(false)}
            className="absolute right-0 top-full z-20 mt-2 flex w-56 flex-col gap-1 rounded-xl border border-border bg-surface p-2 shadow-lg"
          >
            {children}
          </div>
        </>
      )}
    </div>
  );
}
