import { NOW_HEADER } from "../../shared/types";

/**
 * ISO 8601 with a numeric offset, e.g. 2026-11-10T14:15:00-07:00.
 * `Z` and bare timestamps are rejected. The demo clock is the only caller that
 * should send this, via X-Hallpass-Now.
 */
const OFFSET_ISO =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?([+-])(\d{2}):(\d{2})$/;

/** Parsed instant, or null when the value is missing or not ISO with a numeric offset. */
export function parseOffsetDateTime(value: string | null | undefined): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  const match = OFFSET_ISO.exec(trimmed);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const sign = match[8];
  const offsetHour = Number(match[9]);
  const offsetMinute = Number(match[10]);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59) return null;
  if (offsetHour > 14 || offsetMinute > 59 || (offsetHour === 14 && offsetMinute !== 0)) return null;

  const parsed = Date.parse(trimmed);
  if (!Number.isFinite(parsed)) return null;

  const offsetMinutes = (sign === "+" ? 1 : -1) * (offsetHour * 60 + offsetMinute);
  const wall = new Date(parsed + offsetMinutes * 60_000);
  if (
    wall.getUTCFullYear() !== year ||
    wall.getUTCMonth() + 1 !== month ||
    wall.getUTCDate() !== day ||
    wall.getUTCHours() !== hour ||
    wall.getUTCMinutes() !== minute ||
    wall.getUTCSeconds() !== second
  ) {
    return null;
  }
  return new Date(parsed);
}

/**
 * Conference "now". Honors X-Hallpass-Now only when it parses as ISO 8601 with a
 * numeric offset. Anything else, including a missing header, is the real clock.
 */
export function now(request: Request): Date {
  const header = request.headers.get(NOW_HEADER);
  return parseOffsetDateTime(header) ?? new Date();
}
