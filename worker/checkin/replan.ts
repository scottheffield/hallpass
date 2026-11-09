import { EVENT_OFFSET } from "../../shared/event";
import type { PlanBreak, PlanItem, Profile, Session } from "../../shared/types";
import { overlaps } from "../lib/agenda";
import type { ReplanSignal } from "../plan";
import { getCachedSessions, sessionById } from "../plan/agenda-cache";
import type { PlanDay } from "./diff";
import { goalForPlanReason, goalsReferToSameTopic } from "./goal";

function upcomingItems(day: PlanDay, afterSessionId: string): PlanItem[] {
  const index = day.items.findIndex((item) => item.session_id === afterSessionId);
  if (index < 0) return [];
  return day.items.slice(index + 1).filter((item) => item.status === "planned" && !item.pinned);
}

function plannedSessionIds(day: PlanDay): Set<string> {
  return new Set(day.items.map((item) => item.session_id));
}

function scheduledSessions(day: PlanDay, exceptId?: string): Session[] {
  return day.items
    .filter((item) => item.session_id !== exceptId)
    .map((item) => sessionById(item.session_id))
    .filter((session): session is Session => Boolean(session));
}

function scoreSessionForGoal(session: Session, goal: string): number {
  const needles = goal
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 4);
  const hay = `${session.title} ${session.search_text} ${session.track}`.toLowerCase();
  return needles.reduce((sum, needle) => (hay.includes(needle) ? sum + 1 : sum), 0);
}

function findAgendaAlternative(
  day: string,
  goal: string,
  dayPlan: PlanDay,
  replaceId: string,
  fromMs: number,
): Session | null {
  const onPlan = plannedSessionIds(dayPlan);
  const scheduled = scheduledSessions(dayPlan, replaceId);
  const candidates = getCachedSessions()
    .filter((session) => session.start.slice(0, 10) === day && !session.all_access)
    .filter((session) => session.id !== replaceId && !onPlan.has(session.id))
    .filter((session) => !Number.isFinite(fromMs) || Date.parse(session.start) >= fromMs)
    .map((session) => ({ session, score: scoreSessionForGoal(session, goal) }))
  .filter((row) => row.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || a.session.start.localeCompare(b.session.start) || a.session.id.localeCompare(b.session.id),
    );

  for (const { session } of candidates) {
    if (scheduled.some((other) => overlaps(session, other))) continue;
    return session;
  }
  return null;
}

function swapReason(goal: string, _replacement: Session, note: string): string {
  return note.trim() || `it covers ${goal.replace(/\.$/, "")} directly`;
}

function swapItemForGoal(
  day: string,
  dayPlan: PlanDay,
  target: PlanItem,
  goal: string,
  from: string,
): PlanItem | null {
  const fromMs = Date.parse(from);
  const beatId = target.beat_alternative?.session_id;
  let replacement: Session | null = null;
  let note = target.beat_alternative?.why ?? "";

  if (beatId && !plannedSessionIds(dayPlan).has(beatId)) {
    const beat = sessionById(beatId);
    if (beat) {
      const scheduled = scheduledSessions(dayPlan, target.session_id);
      if (!scheduled.some((other) => overlaps(beat, other))) replacement = beat;
    }
  }

  if (!replacement) {
    replacement = findAgendaAlternative(day, goal, dayPlan, target.session_id, fromMs);
    note = note || `it covers ${goal.replace(/\.$/, "")} directly`;
  }

  if (!replacement) return null;

  return {
    ...target,
    session_id: replacement.id,
    reason: swapReason(goal, replacement, note),
    beat_alternative: undefined,
  };
}

function itemServesGoal(item: PlanItem, goal: string, profileGoals: readonly string[]): boolean {
  const served = goalForPlanReason(item.reason, profileGoals);
  if (!served) return false;
  return goalsReferToSameTopic(served, goal);
}

/**
 * Check-in slice replan until `worker/plan` implements full async replan.
 * Keeps done and pinned items; adjusts only the rest of today from the signal.
 */
export function adjustDayAfterCheckin(
  profile: Profile,
  conferenceDay: string,
  day: PlanDay,
  from: string,
  signal: ReplanSignal,
): PlanDay {
  const next = structuredClone(day);

  if (signal.moved_goal === "no") {
    const checkedIn = next.items.find((item) => item.session_id === signal.session_id);
    const checkedGoal = checkedIn ? goalForPlanReason(checkedIn.reason, profile.goals) : null;
    if (checkedGoal) {
      const target = upcomingItems(next, signal.session_id).find((item) => itemServesGoal(item, checkedGoal, profile.goals));
      if (target) {
        const index = next.items.findIndex((item) => item.session_id === target.session_id);
        const swapped = swapItemForGoal(conferenceDay, next, target, checkedGoal, from);
        if (swapped && index >= 0) {
          next.items[index] = swapped;
        } else if (index >= 0) {
          next.items = next.items.filter((item) => item.session_id !== target.session_id);
        }
      }
    } else {
      const drop = upcomingItems(next, signal.session_id)[0];
      if (drop) next.items = next.items.filter((item) => item.session_id !== drop.session_id);
    }
  } else if (signal.worth_it === "no") {
    const drop = upcomingItems(next, signal.session_id)[0];
    if (drop) next.items = next.items.filter((item) => item.session_id !== drop.session_id);
  }

  const addPause = signal.moved_goal === "yes" && signal.worth_it === "yes" && profile.pacing === "light";
  if (addPause) {
    const start = from.replace(/:\d{2}$/, ":00");
    const endMs = Date.parse(start) + 15 * 60_000;
    if (Number.isFinite(endMs)) {
      const end = new Date(endMs);
      const pad = (n: number) => String(n).padStart(2, "0");
      const offsetHours = 7;
      const wall = new Date(end.getTime() - offsetHours * 3_600_000);
      const endIso = `${wall.getUTCFullYear()}-${pad(wall.getUTCMonth() + 1)}-${pad(wall.getUTCDate())}T${pad(wall.getUTCHours())}:${pad(wall.getUTCMinutes())}:${pad(wall.getUTCSeconds())}${EVENT_OFFSET}`;
      const breakItem: PlanBreak = { start, end: endIso, note: "Short pause before the next session." };
      const duplicate = next.breaks.some((b) => b.start === breakItem.start && b.end === breakItem.end);
      if (!duplicate) next.breaks = [...next.breaks, breakItem];
    }
  }

  return next;
}
