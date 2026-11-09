import { EVENT_TIME_ZONE } from "./event";
import type { IsoDateTime } from "./types";

/** Conference wall time for attendee copy, e.g. "3:40 PM". */
export function formatDisplayTime(iso: IsoDateTime | string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: EVENT_TIME_ZONE,
  }).format(new Date(ms));
}
