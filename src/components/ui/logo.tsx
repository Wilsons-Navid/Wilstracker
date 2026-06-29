/**
 * WilsTracker brand mark — "Quiet Ascent". A single teal line folds into a "W"
 * and breaks upward on its last stroke to a resolved dot: the candidate who
 * rose. Inline SVG so it stays razor-crisp from 16px to a billboard and picks
 * up the app's teal accent rather than fighting it.
 *
 * - `mark` renders just the symbol, sized via `className` (nav bars sit it next
 *   to the "WilsTracker" wordmark text the layout already renders).
 * - the default renders the full centred lockup (mark + wordmark + tagline) for
 *   spacious surfaces like the auth screens.
 */

function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="WilsTracker"
      className={className}
    >
      <defs>
        <linearGradient
          id="wt-mark"
          x1="7"
          y1="35"
          x2="41"
          y2="8"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#0f766e" />
          <stop offset="1" stopColor="#2dd4bf" />
        </linearGradient>
      </defs>
      <path
        d="M7 17 L15 35 L24 23 L32 35 L41 8"
        stroke="url(#wt-mark)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="41" cy="8" r="4.5" fill="#2dd4bf" />
    </svg>
  );
}

export default function Logo({
  className,
  mark = false,
}: {
  className?: string;
  mark?: boolean;
}) {
  if (mark) {
    return <Mark className={className} />;
  }

  return (
    <span className={`inline-flex flex-col items-center gap-2 ${className ?? ""}`}>
      <Mark className="h-12 w-12" />
      <span className="text-2xl font-semibold tracking-tight text-foreground">
        WilsTracker
      </span>
      <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted">
        Hire smarter. Track better.
      </span>
    </span>
  );
}
