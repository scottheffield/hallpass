import { EVENT_DAYS, EVENT_OFFSET, EVENT_TIME_ZONE, type EventDay } from "../../../shared/event";
import type { IsoDateTime } from "../../../shared/types";

const WALL_TIME = /^(\d{2}):(\d{2})$/;

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

/** Conference wall clock in America/Denver, regardless of how the ISO offset is stored. */
export function splitDemoIso(iso: IsoDateTime): { day: EventDay; hour: number; minute: number } | null {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;

  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: EVENT_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(ms))
      .map((part) => [part.type, part.value]),
  );

  const day = `${parts.year}-${parts.month}-${parts.day}`;
  if (!isEventDay(day)) return null;
  const hour = Number(parts.hour);
  const minute = Number(parts.minute);
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
