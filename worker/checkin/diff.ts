import type { PlanBreak, PlanChange, PlanItem } from "../../shared/types";
import { sessionById } from "../plan/agenda-cache";
import type { ReplanSignal } from "../plan";

export type PlanDay = { items: PlanItem[]; breaks: PlanBreak[] };

export type DiffPlanDayOptions = {
  /** Check-in signal for why the rest of today was adjusted. */
  signal?: ReplanSignal;
};

const MAX_CHANGES = 3;
const MAX_REASON_CHARS = 140;

function plannedIds(day: PlanDay): string[] {
  return day.items.filter((item) => item.status === "planned").map((item) => item.session_id);
}

function breakKey(breakItem: PlanBreak): string {
  return `${breakItem.start}|${breakItem.end}|${breakItem.note}`;
}

function breakSetsEqual(a: PlanBreak[], b: PlanBreak[]): boolean {
  const left = new Set(a.map(breakKey));
  const right = new Set(b.map(breakKey));
  if (left.size !== right.size) return false;
  for (const key of left) {
    if (!right.has(key)) return false;
  }
  return true;
}

/** Conference wall time as shown in change copy, e.g. "12:20". */
function formatAgendaTime(iso: string): string {
  const match = /T(\d{2}):(\d{2})/.exec(iso);
  if (!match) return "";
  const hour = Number(match[1]);
  const minute = match[2];
  if (minute === "00") return String(hour);
  return `${hour}:${minute}`;
}

function sessionLabel(sessionId: string): { title: string; time: string; room: string } {
  const session = sessionById(sessionId);
  if (!session) return { title: "a later session", time: "", room: "" };
  return { title: session.title, time: formatAgendaTime(session.start), room: session.room };
}

function swapPairs(before: PlanDay, after: PlanDay): Array<{ from: string; to: string; reason: string }> {
  const beforePlanned = new Set(plannedIds(before));
  const afterPlanned = new Set(plannedIds(after));
  const pairs: Array<{ from: string; to: string; reason: string }> = [];
  const limit = Math.min(before.items.length, after.items.length);
  for (let index = 0; index < limit; index++) {
    const prev = before.items[index];
    const next = after.items[index];
    if (prev.status !== "planned" || next.status !== "planned") continue;
    if (prev.session_id === next.session_id) continue;
    if (!beforePlanned.has(prev.session_id) || !afterPlanned.has(next.session_id)) continue;
    if (afterPlanned.has(prev.session_id) || beforePlanned.has(next.session_id)) continue;
    pairs.push({ from: prev.session_id, to: next.session_id, reason: next.reason });
  }
  return pairs;
}

function swapChangeText(sessionId: string, reason: string): string {
  const { title, time, room } = sessionLabel(sessionId);
  const roomPhrase = room ? ` in ${room}` : "";
  const base =
    title === "a later session"
      ? `Swapped in a session for the rest of today`
      : `Swapped in ${title}${atTimePhrase(time)}${roomPhrase}`;
  const detail = trimReason(reason);
  return withReasonClause(base, detail);
}

function atTimePhrase(time: string): string {
  return time ? ` at ${time}` : "";
}

function trimReason(reason: string): string {
  let text = reason.trim();
  if (!text) return "";
  while (text.endsWith(".")) text = text.slice(0, -1).trimEnd();
  if (text.length <= MAX_REASON_CHARS) return text;
  return `${text.slice(0, MAX_REASON_CHARS - 1).trimEnd()}…`;
}

function checkinReasonPhrase(signal: ReplanSignal | undefined): string {
  if (!signal) return "";
  if (signal.moved_goal === "no") return "you said the last session didn't move your goal";
  if (signal.worth_it === "no") return "you said the last session wasn't worth it";
  if (signal.worth_it === "mixed" || signal.moved_goal === "a_little") {
    return "you wanted a lighter rest of the day";
  }
  return "";
}

function withReasonClause(base: string, reason: string): string {
  if (!reason) return `${base}.`;
  return `${base}: ${reason}.`;
}

/**
 * Pure diff from a day after check-in (done marked) to a proposed replan of the same day.
 * Caps at three bullets. Returns [] when nothing meaningful changed.
 */
export function diffPlanDay(before: PlanDay, after: PlanDay, options?: DiffPlanDayOptions): PlanChange[] {
  if (JSON.stringify(before) === JSON.stringify(after)) return [];

  const signal = options?.signal;
  const changes: PlanChange[] = [];
  const beforePlanned = new Set(plannedIds(before));
  const afterPlanned = new Set(plannedIds(after));
  const swappedFrom = new Set<string>();
  const swappedTo = new Set<string>();

  for (const pair of swapPairs(before, after)) {
    swappedFrom.add(pair.from);
    swappedTo.add(pair.to);
    changes.push({
      kind: "moved",
      session_id: pair.to,
      text: swapChangeText(pair.to, pair.reason),
    });
  }

  for (const item of before.items) {
    if (item.status !== "planned") continue;
    if (swappedFrom.has(item.session_id)) continue;
    if (!afterPlanned.has(item.session_id)) {
      const { title, time } = sessionLabel(item.session_id);
      const base =
        title === "a later session"
          ? `Dropped a later session`
          : `Dropped ${title}${atTimePhrase(time)}`;
      changes.push({
        kind: "removed",
        session_id: item.session_id,
        text: withReasonClause(base, checkinReasonPhrase(signal)),
      });
    }
  }

  for (const item of after.items) {
    if (item.status !== "planned") continue;
    if (swappedTo.has(item.session_id)) continue;
    if (!beforePlanned.has(item.session_id)) {
      const { title, time } = sessionLabel(item.session_id);
      const base =
        title === "a later session"
          ? `Added a session to the rest of today`
          : `Added ${title}${atTimePhrase(time)}`;
      changes.push({
        kind: "added",
        session_id: item.session_id,
        text: withReasonClause(base, trimReason(item.reason)),
      });
    }
  }

  const shared = plannedIds(before).filter((id) => afterPlanned.has(id));
  if (shared.length > 1) {
    const orderBefore = plannedIds(before).filter((id) => shared.includes(id));
    const orderAfter = plannedIds(after).filter((id) => shared.includes(id));
    if (orderBefore.join("\0") !== orderAfter.join("\0")) {
      const moved =
        orderAfter.find((id, index) => orderBefore[index] !== id) ??
        orderAfter.find((id) => orderBefore.indexOf(id) !== orderAfter.indexOf(id));
      if (moved) {
        const { title, time } = sessionLabel(moved);
        const base =
          title === "a later session"
            ? `Moved a session in today's order`
            : `Moved ${title}${atTimePhrase(time)} in today's order`;
        changes.push({
          kind: "moved",
          session_id: moved,
          text: `${base}.`,
        });
      }
    }
  }

  if (!breakSetsEqual(before.breaks, after.breaks)) {
    changes.push({ kind: "break", text: "Adjusted a break for the rest of today." });
  }

  if (changes.length === 0) return [];
  return changes.slice(0, MAX_CHANGES);
}
