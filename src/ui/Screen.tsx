import type { ReactNode } from "react";
import { useShellNav } from "../nav/ShellNavContext";
import { Button } from "./Button";
import { HelloMark } from "./HelloMark";

export interface ScreenProps {
  /** Page title. Rendered as the only h1. */
  heading: string;
  /** Modest title on entry. Large title on working screens. */
  headingSize?: "md" | "lg";
  /** Small context above the title, such as the event name. */
  kicker?: string;
  kickerDetail?: string;
  /** Compact Hallpass wordmark in the header. */
  brand?: boolean;
  /** Overrides shell home navigation for the brand control. */
  onGoHome?: () => void;
  onBack?: () => void;
  backLabel?: string;
  /** Trailing header slot: a date, Close, or another labeled control. */
  headerEnd?: ReactNode;
  /** Status line shown above the title. */
  lead?: ReactNode;
  children: ReactNode;
}

const HEADING = {
  md: "text-xl font-medium",
  lg: "text-[2rem] font-semibold leading-[1.15]",
} as const;

export function Screen({
  heading,
  headingSize = "lg",
  kicker,
  kickerDetail,
  brand = false,
  onGoHome,
  onBack,
  backLabel = "← Back",
  headerEnd,
  lead,
  children,
}: ScreenProps) {
  const shellNav = useShellNav();
  const goHome = onGoHome ?? shellNav?.onGoHome;
  const showRow = brand || kicker || kickerDetail || headerEnd;

  return (
    <div className="flex flex-col">
      {onBack ? (
        <div className="mb-2">
          <Button
            variant="quiet"
            className="min-h-11 justify-start px-0"
            onClick={onBack}
            aria-label={backLabel}
          >
            {backLabel}
          </Button>
        </div>
      ) : null}
      {showRow ? (
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            {brand ? <HelloMark compact onActivate={goHome} /> : null}
            {kicker ? <p className="text-sm text-ink">{kicker}</p> : null}
            {kickerDetail ? <p className="text-sm text-muted">{kickerDetail}</p> : null}
          </div>
          {headerEnd ? <div className="shrink-0 text-sm font-semibold text-muted">{headerEnd}</div> : null}
        </div>
      ) : null}
      {lead ? <div className="mb-3">{lead}</div> : null}
      <h1 className={`font-display tracking-tight text-balance text-ink ${HEADING[headingSize]}`}>{heading}</h1>
      <div className="mt-4">{children}</div>
    </div>
  );
}
