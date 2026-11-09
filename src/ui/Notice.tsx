import type { ReactNode } from "react";

export type NoticeTone = "info" | "loading" | "empty" | "offline" | "error" | "stub";

export interface NoticeProps {
  tone: NoticeTone;
  title: string;
  children?: ReactNode;
}

const TONE: Record<
  NoticeTone,
  { label: string; className: string; role?: "status" | "alert"; live?: "polite" | "assertive" }
> = {
  info: {
    label: "Note",
    className: "border-l-4 border-action",
  },
  loading: {
    label: "Loading",
    className: "border-l-4 border-ink",
    role: "status",
    live: "polite",
  },
  empty: {
    label: "Empty",
    className: "border border-dashed border-line",
  },
  offline: {
    label: "Offline",
    className: "border-l-4 border-ink",
    role: "status",
    live: "polite",
  },
  error: {
    label: "Problem",
    className: "border-l-4 border-danger",
    role: "alert",
    live: "assertive",
  },
  stub: {
    label: "Not built yet",
    className: "border border-dashed border-line",
  },
};

export function Notice({ tone, title, children }: NoticeProps) {
  const spec = TONE[tone];
  return (
    <div
      role={spec.role}
      aria-live={spec.live}
      className={`flex flex-col gap-1 rounded-xl bg-surface px-3 py-3 text-ink ${spec.className}`}
    >
      <p className="text-xs font-semibold tracking-wide text-muted uppercase">{spec.label}</p>
      <p className="font-display text-lg font-semibold leading-tight">{title}</p>
      {children ? <div className="text-base leading-snug">{children}</div> : null}
    </div>
  );
}
