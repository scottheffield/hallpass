import type { Plan, Session } from "../../shared/types";
import {
  buildDayTimeline,
  conferenceDateKey,
  formatTimeRange,
  parseInstant,
} from "../screens/today/timeline";
import type { CheckInTarget } from "./types";

/**
 * A planned session whose block ended by the clock is eligible for check-in.
 * Today can own the opener later; the shell may surface this quietly.
 */
export function findCheckInOffer(now: Date, plan: Plan | null, sessions: Session[]): CheckInTarget | null {
  if (!plan) return null;
  const dayKey = conferenceDateKey(now);
  const day = plan.days[dayKey];
  const timeline = buildDayTimeline(sessions, day);
  const nowMs = now.getTime();

  let latest: (typeof timeline)[number] | null = null;
  let latestEnd = Number.NEGATIVE_INFINITY;

  for (const block of timeline) {
    if (block.kind !== "session") continue;
    if (block.item.status !== "planned") continue;
    const endMs = parseInstant(block.end);
    if (!Number.isFinite(endMs) || endMs > nowMs) continue;
    if (endMs >= latestEnd) {
      latestEnd = endMs;
      latest = block;
    }
  }

  if (!latest || latest.kind !== "session") return null;

  return {
    sessionId: latest.session.id,
    sessionTitle: latest.session.title,
    sessionTime: formatTimeRange(latest.start, latest.end),
    sessionRoom: latest.session.room,
  };
}
