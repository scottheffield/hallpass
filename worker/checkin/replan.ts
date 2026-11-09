import { EVENT_OFFSET } from "../../shared/event";
import type { PlanBreak, PlanItem, Profile } from "../../shared/types";
import type { ReplanSignal } from "../plan";
import type { PlanDay } from "./diff";

function upcomingItems(day: PlanDay, afterSessionId: string): PlanItem[] {
  const index = day.items.findIndex((item) => item.session_id === afterSessionId);
  const start = index >= 0 ? index + 1 : 0;
  return day.items.slice(start).filter((item) => item.status === "planned" && !item.pinned);
}

/**
 * Check-in slice replan until `worker/plan` implements `replanDay`.
 * Keeps done and pinned items; adjusts only the rest of today from the signal.
 */
export function adjustDayAfterCheckin(profile: Profile, day: PlanDay, from: string, signal: ReplanSignal): PlanDay {
  void from;
  const next = structuredClone(day);

  const steerAway = signal.moved_goal === "no" || signal.worth_it === "no";
  if (steerAway) {
    const drop = upcomingItems(next, signal.session_id)[0];
    if (drop) {
      next.items = next.items.filter((item) => item.session_id !== drop.session_id);
    }
  }

  const addPause = signal.moved_goal === "yes" && signal.worth_it === "yes" && profile.pacing === "light";
  if (addPause) {
    const start = from.replace(/:\d{2}$/, ":00");
    const endMs = Date.parse(start) + 15 * 60_000;
    if (Number.isFinite(endMs)) {
      const end = new Date(endMs);
      const pad = (n: number) => String(n).padStart(2, "0");
      const offsetHours = 7;
      const wall = new Date(end.getTime() - offsetHours * 3_600_000);
      const endIso = `${wall.getUTCFullYear()}-${pad(wall.getUTCMonth() + 1)}-${pad(wall.getUTCDate())}T${pad(wall.getUTCHours())}:${pad(wall.getUTCMinutes())}:${pad(wall.getUTCSeconds())}${EVENT_OFFSET}`;
      const breakItem: PlanBreak = { start, end: endIso, note: "Short pause before the next session." };
      const duplicate = next.breaks.some((b) => b.start === breakItem.start && b.end === breakItem.end);
      if (!duplicate) next.breaks = [...next.breaks, breakItem];
    }
  }

  return next;
}
