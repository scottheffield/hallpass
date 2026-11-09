import type { ReactNode } from "react";

export type SessionCardKind = "session" | "break" | "current" | "suggested";

export interface SessionCardProps {
  title: string;
  /** Already formatted, for example "10:00–10:40" or "10:40". */
  time: string;
  room?: string;
  reason?: string;
  /** Short label above the reason, such as "For your platform goal". */
  reasonLabel?: string;
  kind?: SessionCardKind;
  /** Second line under a break title. */
  detail?: string;
  children?: ReactNode;
}

function PauseMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="shrink-0">
      <rect x="4" y="3" width="3.2" height="12" rx="0.6" fill="currentColor" />
      <rect x="10.8" y="3" width="3.2" height="12" rx="0.6" fill="currentColor" />
    </svg>
  );
}

export function SessionCard({
  title,
  time,
  room,
  reason,
  reasonLabel,
  kind = "session",
  detail,
  children,
}: SessionCardProps) {
  if (kind === "break") {
    return (
      <article className="rounded-xl bg-butter px-3 py-3 text-on-butter">
        <div className="flex items-start gap-3">
          <p className="flex min-h-11 items-center gap-2 pt-0.5 font-semibold">
            <PauseMark />
            <span>{time}</span>
          </p>
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold leading-tight">{title}</h2>
            {detail ? <p className="mt-1 text-base leading-snug">{detail}</p> : null}
          </div>
        </div>
        {children}
      </article>
    );
  }

  if (kind === "current" || kind === "suggested") {
    const suggested = kind === "suggested";
    return (
      <article
        className={`rounded-xl px-3 py-3 ${suggested ? "bg-suggest text-on-suggest" : "text-ink"}`}
      >
        <div className="flex items-start gap-3">
          <div className="w-[5.5rem] shrink-0">
            <p className="text-xs font-semibold tracking-wide uppercase">{suggested ? "Suggested" : "Current"}</p>
            <p className="text-base font-semibold">{time}</p>
          </div>
          <p className="min-w-0 font-display text-lg font-semibold leading-tight">{title}</p>
        </div>
        {room ? <p className="mt-2 text-sm">{room}</p> : null}
        {reasonLabel ? <p className="mt-2 font-semibold">{reasonLabel}</p> : null}
        {reason ? <p className="mt-1 text-base leading-snug">{reason}</p> : null}
        {detail ? <p className="mt-1 text-base leading-snug">{detail}</p> : null}
        {children}
      </article>
    );
  }

  return (
    <article className="text-ink">
      <h2 className="font-display text-[1.65rem] font-semibold leading-tight text-balance">{title}</h2>
      <div className="mt-3 flex items-baseline justify-between gap-3 border-b border-line pb-3">
        <p className="font-semibold">{time}</p>
        {room ? <p>{room}</p> : null}
      </div>
      {reasonLabel ? <p className="mt-3 font-semibold">{reasonLabel}</p> : null}
      {reason ? <p className="mt-1 text-base leading-snug">{reason}</p> : null}
      {detail ? <p className="mt-1 text-base leading-snug">{detail}</p> : null}
      {children ? <div className="mt-3">{children}</div> : null}
    </article>
  );
}
