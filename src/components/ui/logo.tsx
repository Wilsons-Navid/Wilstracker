import Image from "next/image";

/**
 * The WilsTracker brand lockup. The source asset is a square image containing
 * the "W" mark plus the wordmark and tagline.
 *
 * - `mark` renders a compact square badge for tight surfaces (nav bars), meant
 *   to sit next to the "WilsTracker" wordmark text.
 * - the default renders the full lockup for spacious surfaces (auth screens),
 *   where the wordmark/tagline are legible on their own.
 */
export default function Logo({
  className,
  mark = false,
  priority = false,
}: {
  className?: string;
  mark?: boolean;
  priority?: boolean;
}) {
  return (
    <Image
      src="/wilstracker-logo.png"
      alt="WilsTracker"
      width={mark ? 64 : 256}
      height={mark ? 64 : 256}
      priority={priority}
      className={className}
    />
  );
}
