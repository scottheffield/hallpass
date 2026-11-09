import { EVENT_OFFSET, EVENT_TIME_ZONE } from "../../shared/event";
import type { IsoDateTime } from "../../shared/types";

/** Conference-local ISO timestamp with the fixed event offset. */
export function conferenceNowIso(date: Date): IsoDateTime {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: EVENT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const pick = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${pick("year")}-${pick("month")}-${pick("day")}T${pick("hour")}:${pick("minute")}:${pick("second")}${EVENT_OFFSET}`;
}
