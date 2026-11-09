export interface DemoBarSlotProps {
  /** Conference-offset demo clock, already formatted for display. */
  timeLabel: string;
}

/** Quiet demo strip for the app frame. Time controls live in DemoBar. */
export function DemoBarSlot({ timeLabel }: DemoBarSlotProps) {
  return (
    <p className="text-sm leading-snug text-muted" role="status" aria-live="polite">
      <span className="font-semibold text-ink">Demo time</span> {timeLabel}.{" "}
      <span className="text-xs">Illustrative preview. Clock controls ship separately.</span>
    </p>
  );
}
