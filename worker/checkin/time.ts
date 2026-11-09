import { EVENT_OFFSET } from "../../shared/event";
import type { IsoDateTime } from "../../shared/types";

/** Conference wall clock as ISO 8601 with the event offset. */
export function conferenceIsoFromDate(date: Date): IsoDateTime {
  const offsetHours = 7;
  const wall = new Date(date.getTime() - offsetHours * 3_600_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${wall.getUTCFullYear()}-${pad(wall.getUTCMonth() + 1)}-${pad(wall.getUTCDate())}T${pad(wall.getUTCHours())}:${pad(wall.getUTCMinutes())}:${pad(wall.getUTCSeconds())}${EVENT_OFFSET}`;
}
