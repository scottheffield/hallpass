import { EVENT_DAYS, EVENT_OFFSET, EVENT_TIME_ZONE, type EventDay } from "../../../shared/event";
import type { IsoDateTime } from "../../../shared/types";

const WALL_TIME = /^(\d{2}):(\d{2})$/;
const DEMO_PARTS = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})/;

export function isEventDay(value: string): value is EventDay {
  return (EVENT_DAYS as readonly string[]).includes(value);
}

export function parseDemoWallTime(value: string): { hour: number; minute: number } | null {
  const match = WALL_TIME.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

export function formatDemoWallTime(hour: number, minute: number): string {
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new Error("Wall time is out of range.");
  }
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function buildDemoIso(day: EventDay, hour: number, minute: number): IsoDateTime {
  if (!isEventDay(day)) throw new Error("Unknown conference day.");
  return `${day}T${formatDemoWallTime(hour, minute)}:00${EVENT_OFFSET}`;
}

/** Read the conference wall clock embedded in a demo timestamp. */
export function splitDemoIso(iso: IsoDateTime): { day: EventDay; hour: number; minute: number } | null {
  const match = DEMO_PARTS.exec(iso);
  if (!match) return null;
  const day = match[1];
  if (!isEventDay(day)) return null;
  const hour = Number(match[2]);
  const minute = Number(match[3]);
  if (hour > 23 || minute > 59) return null;
  return { day, hour, minute };
}

export function formatDayShort(day: EventDay): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: EVENT_TIME_ZONE,
  }).format(new Date(`${day}T12:00:00${EVENT_OFFSET}`));
}

export function formatDayLong(day: EventDay): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: EVENT_TIME_ZONE,
  }).format(new Date(`${day}T12:00:00${EVENT_OFFSET}`));
}

export function formatDemoNowLabel(iso: IsoDateTime): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: EVENT_TIME_ZONE,
    timeZoneName: "short",
  }).format(new Date(iso));
}
