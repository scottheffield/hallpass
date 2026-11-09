import { EVENT_TIME_ZONE } from "../../../shared/event";
import type { PlanBreak, PlanItem } from "../../../shared/types";

export function dayTabLabel(dayKey: string): string {
  const noon = Date.parse(`${dayKey}T12:00:00-07:00`);
  if (!Number.isFinite(noon)) return dayKey;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: EVENT_TIME_ZONE,
  }).format(new Date(noon));
}

export function dayNeedsGeneration(
  day: { items: PlanItem[]; breaks: PlanBreak[] } | undefined,
): boolean {
  if (!day) return true;
  return day.items.length === 0 && day.breaks.length === 0;
}
