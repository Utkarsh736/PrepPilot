/**
 * Prep Pilot brand mark — a simplified attitude indicator (the instrument
 * that shows an aircraft's orientation relative to the horizon).
 * Circle + horizon line + center dot + attitude ticks. Drawn with
 * currentColor so context sets the color.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="16" cy="16" r="12.5" stroke="currentColor" strokeWidth="2.4" />
      <path d="M6.5 16h19" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M16 5.5v2.6M16 23.9v2.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="16" cy="16" r="3.1" fill="currentColor" />
    </svg>
  );
}

/** Wordmark: instrument mark + "Prep Pilot" set in Fraunces. */
export function BrandWordmark({
  markClassName = "h-6 w-6",
  textClassName = "text-base",
}: {
  markClassName?: string;
  textClassName?: string;
}) {
  return (
    <span className="flex items-center gap-2">
      <BrandMark className={`${markClassName} text-primary`} />
      <span
        className={`font-display font-semibold tracking-tight text-foreground ${textClassName}`}
      >
        Prep&nbsp;Pilot
      </span>
    </span>
  );
}
