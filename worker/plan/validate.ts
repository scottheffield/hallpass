import { EVENT_OFFSET } from "../../shared/event";
import type { Pacing, PlanBreak, PlanItem, Session } from "../../shared/types";
import { parseRoom, transferMinutes } from "../../shared/venue";
import { overlaps } from "../lib/agenda";

export interface RawPick {
  session_id: string;
  reason: string;
  beat_alternative?: { session_id: string; why: string };
  clash_note?: string;
}

export interface ValidateOptions {
  pacing: Pacing;
  candidateIds: Set<string>;
  sessions: Map<string, Session>;
  pinned: PlanItem[];
}

function breakCountOk(pacing: Pacing, count: number): boolean {
  if (pacing === "packed") return count <= 1;
  if (pacing === "balanced") return count <= 2;
  return count >= 2;
}

function breakCapFor(pacing: Pacing): number {
  if (pacing === "packed") return 1;
  if (pacing === "balanced") return 2;
  return Number.POSITIVE_INFINITY;
}

function isValidPlanBreak(br: PlanBreak): boolean {
  const startMs = Date.parse(br.start);
  const endMs = Date.parse(br.end);
  return (
    Number.isFinite(startMs) &&
    Number.isFinite(endMs) &&
    startMs < endMs &&
    br.start.endsWith(EVENT_OFFSET) &&
    br.end.endsWith(EVENT_OFFSET)
  );
}

/** Valid conference-offset breaks, capped for packed and balanced pacing. */
export function normalizePlanBreaks(pacing: Pacing, breaks: PlanBreak[]): PlanBreak[] {
  const validBreaks = breaks.filter(isValidPlanBreak);
  return validBreaks.slice(0, breakCapFor(pacing));
}

function sanitizeText(value: string, max: number): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

function sortByStart(items: PlanItem[], sessions: Map<string, Session>): PlanItem[] {
  return [...items].sort((a, b) => {
    const aStart = sessions.get(a.session_id)?.start ?? "";
    const bStart = sessions.get(b.session_id)?.start ?? "";
    return aStart.localeCompare(bStart) || a.session_id.localeCompare(b.session_id);
  });
}

/** Minutes between the end of one session and the start of the next. */
export function gapMinutesBetween(prevEnd: string, nextStart: string): number {
  const gapMs = Date.parse(nextStart) - Date.parse(prevEnd);
  if (!Number.isFinite(gapMs)) return 0;
  return Math.max(0, Math.round(gapMs / 60_000));
}

/** Minimum gap needed before the next pick; light pacing doubles walking time. */
export function requiredTransferMinutes(pacing: Pacing, fromRoom: string, toRoom: string): number {
  const walk = transferMinutes(fromRoom, toRoom);
  return pacing === "light" ? walk * 2 : walk;
}

export function isTightTransfer(
  pacing: Pacing,
  prev: Session,
  next: Session,
): boolean {
  const gap = gapMinutesBetween(prev.end, next.start);
  const needed = requiredTransferMinutes(pacing, prev.room, next.room);
  return gap < needed;
}

function destinationLabel(room: string): string {
  const parsed = parseRoom(room);
  if (parsed.building === "Hyatt Regency") return "the Hyatt Regency";
  if (parsed.building === "Salt Palace" && parsed.room) return parsed.room;
  if (parsed.kind === "off-site") return "Off-Site Location";
  if (parsed.room) return parsed.room;
  const trimmed = room.trim();
  return trimmed || "the next room";
}

function originLabel(room: string): string {
  const parsed = parseRoom(room);
  if (parsed.building === "Salt Palace" && parsed.room) return parsed.room;
  if (parsed.building === "Hyatt Regency") return "the Hyatt Regency";
  if (parsed.kind === "off-site") return "Off-Site Location";
  if (parsed.room) return parsed.room;
  const trimmed = room.trim();
  return trimmed || "the prior room";
}

/** Same minute estimate Directions uses, in plan copy. */
export function formatTightChangeNote(fromRoom: string, toRoom: string, gapMinutes: number): string {
  const walk = transferMinutes(fromRoom, toRoom);
  return `Tight change: ${destinationLabel(toRoom)} is about ${walk} minutes from ${originLabel(fromRoom)}, and you have ${gapMinutes}.`;
}

function canSchedule(session: Session, items: PlanItem[], skipId: string, sessions: Map<string, Session>): boolean {
  for (const item of items) {
    if (item.session_id === skipId) continue;
    const other = sessions.get(item.session_id);
    if (other && overlaps(session, other)) return false;
  }
  return true;
}

function findCloserOverlappingCandidate(
  prev: Session,
  current: Session,
  items: PlanItem[],
  options: ValidateOptions,
): Session | null {
  const currentWalk = transferMinutes(prev.room, current.room);
  let best: Session | null = null;
  let bestWalk = currentWalk;

  for (const id of options.candidateIds) {
    if (id === current.id) continue;
    const alt = options.sessions.get(id);
    if (!alt) continue;
    if (!overlaps(alt, current)) continue;
    if (!canSchedule(alt, items, current.id, options.sessions)) continue;
    const walk = transferMinutes(prev.room, alt.room);
    if (walk >= bestWalk) continue;
    bestWalk = walk;
    best = alt;
  }

  return best;
}

function applyTightTransferPasses(items: PlanItem[], options: ValidateOptions): void {
  for (let i = 1; i < items.length; i++) {
    const prevSession = options.sessions.get(items[i - 1].session_id);
    const item = items[i];
    if (!prevSession || item.pinned) continue;

    let currSession = options.sessions.get(item.session_id);
    if (!currSession) continue;

    if (!isTightTransfer(options.pacing, prevSession, currSession)) continue;

    const closer = findCloserOverlappingCandidate(prevSession, currSession, items, options);
    if (closer) {
      const fromLabel = originLabel(prevSession.room);
      item.session_id = closer.id;
      item.reason = sanitizeText(
        `Closer room for the walk from ${fromLabel}. ${item.reason}`.trim(),
        600,
      );
      currSession = closer;
    }

    if (!isTightTransfer(options.pacing, prevSession, currSession)) continue;

    if (!item.clash_note) {
      const gap = gapMinutesBetween(prevSession.end, currSession.start);
      const note = sanitizeText(formatTightChangeNote(prevSession.room, currSession.room, gap), 400);
      if (note.length >= 8) item.clash_note = note;
    }
  }
}

/**
 * Drop bad model picks. Keep pinned items. Enforce overlaps, ids, and break pacing.
 */
export function validateDayPlan(
  picks: RawPick[],
  breaks: PlanBreak[],
  options: ValidateOptions,
): { items: PlanItem[]; breaks: PlanBreak[]; errors: string[] } {
  const errors: string[] = [];
  const keptPinned = options.pinned.filter((item) => item.pinned);
  const pinnedIds = new Set(keptPinned.map((item) => item.session_id));

  const accepted: PlanItem[] = [...keptPinned];
  const scheduled: Session[] = keptPinned
    .map((item) => options.sessions.get(item.session_id))
    .filter((session): session is Session => Boolean(session));

  if (!breakCountOk(options.pacing, breaks.length)) {
    errors.push(`Break count ${breaks.length} does not fit pacing ${options.pacing}.`);
  }

  for (const pick of picks) {
    if (pinnedIds.has(pick.session_id)) continue;
    if (!options.candidateIds.has(pick.session_id)) {
      errors.push(`Unknown session id ${pick.session_id}.`);
      continue;
    }
    const session = options.sessions.get(pick.session_id);
    if (!session) {
      errors.push(`Missing agenda row for ${pick.session_id}.`);
      continue;
    }
    if (scheduled.some((other) => overlaps(session, other))) {
      errors.push(`Overlap at ${pick.session_id}.`);
      continue;
    }
    const reason = sanitizeText(pick.reason, 600);
    if (reason.length < 12) {
      errors.push(`Reason too short for ${pick.session_id}.`);
      continue;
    }
    const item: PlanItem = { session_id: pick.session_id, status: "planned", reason };
    if (pick.beat_alternative) {
      if (!options.candidateIds.has(pick.beat_alternative.session_id)) {
        errors.push(`Unknown alternative ${pick.beat_alternative.session_id}.`);
      } else {
        const why = sanitizeText(pick.beat_alternative.why, 400);
        if (why.length >= 8) item.beat_alternative = { session_id: pick.beat_alternative.session_id, why };
      }
    }
    if (pick.clash_note) {
      const note = sanitizeText(pick.clash_note, 400);
      if (note.length >= 8) item.clash_note = note;
    }
    accepted.push(item);
    scheduled.push(session);
  }

  if (breaks.some((br) => !isValidPlanBreak(br))) errors.push("Invalid break times.");
  const cappedBreaks = normalizePlanBreaks(options.pacing, breaks);

  const items = sortByStart(accepted, options.sessions);
  applyTightTransferPasses(items, options);
  return { items, breaks: cappedBreaks, errors };
}

/** True when any pair in the list overlaps. */
export function hasOverlaps(items: PlanItem[], sessions: Map<string, Session>): boolean {
  const rows = items
    .map((item) => sessions.get(item.session_id))
    .filter((session): session is Session => Boolean(session));
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      if (overlaps(rows[i], rows[j])) return true;
    }
  }
  return false;
}
