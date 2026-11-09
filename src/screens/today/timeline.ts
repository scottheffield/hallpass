import { EVENT_DAYS, EVENT_TIME_ZONE } from "../../../shared/event";
import type { IsoDateTime, Plan, PlanBreak, PlanItem, Session } from "../../../shared/types";
import { getSession } from "../../lib/agenda";

export type TodayTimelineKind = "session" | "break";

export interface TodaySessionBlock {
  kind: "session";
  session: Session;
  item: PlanItem;
  start: IsoDateTime;
  end: IsoDateTime;
}

export interface TodayBreakBlock {
  kind: "break";
  planBreak: PlanBreak;
  start: IsoDateTime;
  end: IsoDateTime;
}

export type TodayTimelineBlock = TodaySessionBlock | TodayBreakBlock;

export function parseInstant(iso: IsoDateTime): number {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : Number.NaN;
}

/** Conference calendar date in Mountain Time, YYYY-MM-DD. */
export function conferenceDateKey(instant: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: EVENT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

export function formatHeaderDate(dayKey: string): string {
  const noon = Date.parse(`${dayKey}T12:00:00-07:00`);
  if (!Number.isFinite(noon)) return dayKey;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: EVENT_TIME_ZONE,
  }).format(new Date(noon));
}

export function formatTime(iso: IsoDateTime): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: EVENT_TIME_ZONE,
  }).format(new Date(iso));
}

export function formatTimeRange(start: IsoDateTime, end: IsoDateTime): string {
  return `${formatTime(start)}–${formatTime(end)}`;
}

export function formatBreakTime(start: IsoDateTime, end: IsoDateTime): string {
  const durationMs = parseInstant(end) - parseInstant(start);
  if (Number.isFinite(durationMs) && durationMs > 90 * 60 * 1000) {
    return formatTimeRange(start, end);
  }
  return formatTime(start);
}

export function buildDayTimeline(
  sessions: Session[],
  day: { items: PlanItem[]; breaks: PlanBreak[] } | undefined,
): TodayTimelineBlock[] {
  if (!day) return [];

  const blocks: TodayTimelineBlock[] = [];

  for (const item of day.items) {
    const session = getSession(sessions, item.session_id);
    if (!session) continue;
    blocks.push({
      kind: "session",
      session,
      item,
      start: session.start,
      end: session.end,
    });
  }

  for (const planBreak of day.breaks) {
    blocks.push({
      kind: "break",
      planBreak,
      start: planBreak.start,
      end: planBreak.end,
    });
  }

  return blocks.sort((a, b) => {
    const byStart = parseInstant(a.start) - parseInstant(b.start);
    if (byStart !== 0) return byStart;
    if (a.kind !== b.kind) return a.kind === "session" ? -1 : 1;
    if (a.kind === "session" && b.kind === "session") {
      return a.session.id.localeCompare(b.session.id);
    }
    return 0;
  });
}

export interface NextPlannedSession {
  block: TodaySessionBlock;
  heading: string;
}

/** Next planned session that has not ended yet. Skips done and skipped items. */
export function nextPlannedSession(blocks: TodayTimelineBlock[], nowMs: number): NextPlannedSession | null {
  for (const block of blocks) {
    if (block.kind !== "session") continue;
    if (block.item.status !== "planned") continue;
    if (parseInstant(block.end) <= nowMs) continue;
    return {
      block,
      heading: `Next, at ${formatTime(block.start)}`,
    };
  }
  return null;
}

export function activeBreak(blocks: TodayTimelineBlock[], nowMs: number): TodayBreakBlock | null {
  for (const block of blocks) {
    if (block.kind !== "break") continue;
    const start = parseInstant(block.start);
    const end = parseInstant(block.end);
    if (start <= nowMs && nowMs < end) return block;
  }
  return null;
}

export function breakFollowingSession(
  blocks: TodayTimelineBlock[],
  session: TodaySessionBlock,
): TodayBreakBlock | null {
  const sessionEnd = parseInstant(session.end);
  for (const block of blocks) {
    if (block.kind !== "break") continue;
    const start = parseInstant(block.start);
    if (start >= sessionEnd) return block;
  }
  return null;
}

export function breakTitle(note: string): string {
  const trimmed = note.trim();
  if (!trimmed) return "Room to breathe";
  const first = trimmed.split(".")[0]?.trim();
  return first && first.length <= 48 ? first : "Room to breathe";
}

export function breakDetail(note: string): string | undefined {
  const trimmed = note.trim();
  if (!trimmed) return undefined;
  const title = breakTitle(trimmed);
  if (title === trimmed) return undefined;
  return trimmed;
}

export interface DayFinishedState {
  kind: "day-done";
  dayKey: string;
  nextDayKey?: string;
  nextSessionTitle?: string;
  nextSessionTime?: string;
}

export interface OffConferenceState {
  kind: "off-event";
  dayKey: string;
}

export type TodayHeading =
  | { kind: "next"; text: string }
  | { kind: "in-break"; text: string }
  | DayFinishedState
  | OffConferenceState
  | { kind: "empty-day"; text: string };

export function resolveTodayHeading(
  dayKey: string,
  blocks: TodayTimelineBlock[],
  nowMs: number,
  plan: Plan,
  sessions: Session[],
): TodayHeading {
  if (!(EVENT_DAYS as readonly string[]).includes(dayKey)) {
    return { kind: "off-event", dayKey };
  }

  if (blocks.length === 0) {
    return { kind: "empty-day", text: "No sessions on your plan for today." };
  }

  const inBreak = activeBreak(blocks, nowMs);
  const next = nextPlannedSession(blocks, nowMs);
  if (next) {
    if (inBreak) return { kind: "in-break", text: `On a break until ${formatTime(inBreak.end)}` };
    return { kind: "next", text: next.heading };
  }

  const dayIndex = EVENT_DAYS.indexOf(dayKey as (typeof EVENT_DAYS)[number]);
  for (let index = dayIndex + 1; index < EVENT_DAYS.length; index++) {
    const laterKey = EVENT_DAYS[index];
    const laterDay = plan.days[laterKey];
    if (!laterDay) continue;
    for (const item of laterDay.items) {
      if (item.status !== "planned") continue;
      const session = getSession(sessions, item.session_id);
      if (!session) continue;
      return {
        kind: "day-done",
        dayKey,
        nextDayKey: laterKey,
        nextSessionTitle: session.title,
        nextSessionTime: formatTimeRange(session.start, session.end),
      };
    }
  }

  return {
    kind: "day-done",
    dayKey,
  };
}

export function nowInstant(iso: IsoDateTime | null, fallback: Date): Date {
  if (!iso) return fallback;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? new Date(ms) : fallback;
}