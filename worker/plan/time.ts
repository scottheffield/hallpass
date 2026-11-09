import { EVENT_OFFSET, EVENT_TIME_ZONE } from "../../shared/event";
import type { IsoDateTime } from "../../shared/types";

/** Conference wall time with a fixed offset for storage. */
export function toConferenceIso(instant: Date): IsoDateTime {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: EVENT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(instant);
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${pick("year")}-${pick("month")}-${pick("day")}T${pick("hour")}:${pick("minute")}:${pick("second")}${EVENT_OFFSET}`;
}

export function isConferenceOffset(value: string): boolean {
  return value.endsWith(EVENT_OFFSET) && Number.isFinite(Date.parse(value));
}
