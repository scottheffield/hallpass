import { EVENT_DAYS, EVENT_TIME_ZONE } from "../../shared/event";
import type { Plan } from "../../shared/types";

export const JOURNEY_PHASES = ["Before you go", "At the conference", "After the conference"] as const;

/** Conference-local calendar phase (demo clock or device time when prepared). */
export function conferencePhase(now: Date): 0 | 1 | 2 {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: EVENT_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((value) => value.type === type)!.value;
  const day = `${part("year")}-${part("month")}-${part("day")}`;
  if (day < EVENT_DAYS[0]) return 0;
  if (day > EVENT_DAYS[EVENT_DAYS.length - 1]) return 2;
  return 1;
}

export function planHasPreparedContent(plan: Plan | null | undefined): boolean {
  if (!plan) return false;
  for (const day of Object.values(plan.days)) {
    if (day.items.length > 0 || day.breaks.length > 0) return true;
  }
  return false;
}

/**
 * Journey step for the indicator: attendee progress until goals and a plan exist;
 * then the conference calendar and demo clock apply.
 */
export function attendeeJourneyPhase(
  now: Date,
  input: { hasProfile: boolean; hasPreparedPlan: boolean },
): 0 | 1 | 2 {
  if (!input.hasProfile || !input.hasPreparedPlan) return 0;
  return conferencePhase(now);
}
