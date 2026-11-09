import { EVENT_DAYS, EVENT_TIME_ZONE } from "../../shared/event";

export const JOURNEY_PHASES = ["Before you go", "At the conference", "After the conference"] as const;

/** Calendar phase, independent of the page being visited or saved-plan progress. */
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
