import { EVENT_OFFSET } from "../../shared/event";
import { NOW_HEADER, type IsoDateTime } from "../../shared/types";

const DEMO_MODE_KEY = "hallpass.demo";
const DEMO_NOW_KEY = "hallpass.demo_now";

/** Same rule as worker/lib/clock.ts: ISO 8601 with a numeric offset only. */
const OFFSET_ISO =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?([+-])(\d{2}):(\d{2})$/;

function parseOffsetIso(value: string | null | undefined): IsoDateTime | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!OFFSET_ISO.test(trimmed)) return null;
  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed) ? (trimmed as IsoDateTime) : null;
}

/** Call once on load. `?demo=1` turns demo mode on and keeps it in localStorage. */
export function syncDemoFromUrl(): void {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "1") localStorage.setItem(DEMO_MODE_KEY, "1");
  } catch {
    // Private mode or blocked storage.
  }
}

export function isDemoMode(): boolean {
  try {
    return localStorage.getItem(DEMO_MODE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Demo clock value, or null when demo mode is off or the stored value is invalid. */
export function getDemoNow(): IsoDateTime | null {
  if (!isDemoMode()) return null;
  try {
    return parseOffsetIso(localStorage.getItem(DEMO_NOW_KEY));
  } catch {
    return null;
  }
}

/** DemoBar and tests move time with a conference-offset timestamp. */
export function setDemoNow(iso: IsoDateTime): void {
  if (!parseOffsetIso(iso)) throw new Error("Demo time must be ISO 8601 with a numeric offset.");
  try {
    localStorage.setItem(DEMO_NOW_KEY, iso);
  } catch {
    // Ignore when storage is blocked.
  }
}

/** Default demo start on the first conference morning when nothing is stored yet. */
export function defaultDemoNow(): IsoDateTime {
  return `2026-11-10T09:00:00${EVENT_OFFSET}`;
}

export function demoNowForRequests(): IsoDateTime | null {
  return getDemoNow() ?? (isDemoMode() ? defaultDemoNow() : null);
}

/** Header name and value for api.ts. Undefined means send no demo clock. */
export function demoNowHeader(): { name: typeof NOW_HEADER; value: IsoDateTime } | undefined {
  const value = demoNowForRequests();
  return value ? { name: NOW_HEADER, value } : undefined;
}
