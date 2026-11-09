import { EVENT_OFFSET } from "../../shared/event";
import type { Pacing, PlanBreak, PlanItem, Session } from "../../shared/types";
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

  const breakCap =
    options.pacing === "packed" ? 1 : options.pacing === "balanced" ? 2 : Number.POSITIVE_INFINITY;
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

  const validBreaks = breaks.filter((br) => {
    const startMs = Date.parse(br.start);
    const endMs = Date.parse(br.end);
    const ok =
      Number.isFinite(startMs) &&
      Number.isFinite(endMs) &&
      startMs < endMs &&
      br.start.endsWith(EVENT_OFFSET) &&
      br.end.endsWith(EVENT_OFFSET);
    if (!ok) errors.push("Invalid break times.");
    return ok;
  });
  const cappedBreaks = validBreaks.slice(0, breakCap);

  return { items: sortByStart(accepted, options.sessions), breaks: cappedBreaks, errors };
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
