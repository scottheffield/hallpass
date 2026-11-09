import type { Plan, Session } from "../../../shared/types";
import {
  buildDayTimeline,
  conferenceDateKey,
  parseInstant,
  type TodaySessionBlock,
} from "./timeline";

/** Planned session whose clock window contains now. */
export function findSessionInProgress(
  now: Date,
  plan: Plan | null,
  sessions: Session[],
): TodaySessionBlock | null {
  if (!plan) return null;
  const dayKey = conferenceDateKey(now);
  const timeline = buildDayTimeline(sessions, plan.days[dayKey]);
  const nowMs = now.getTime();

  for (const block of timeline) {
    if (block.kind !== "session") continue;
    if (block.item.status !== "planned") continue;
    const startMs = parseInstant(block.start);
    const endMs = parseInstant(block.end);
    if (Number.isFinite(startMs) && Number.isFinite(endMs) && startMs <= nowMs && nowMs < endMs) {
      return block;
    }
  }
  return null;
}

export function sessionBlockInProgress(block: TodaySessionBlock, nowMs: number): boolean {
  const startMs = parseInstant(block.start);
  const endMs = parseInstant(block.end);
  return Number.isFinite(startMs) && Number.isFinite(endMs) && startMs <= nowMs && nowMs < endMs;
}
