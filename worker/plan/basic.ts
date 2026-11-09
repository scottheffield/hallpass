import type { Pacing, PlanBreak, PlanItem, Session } from "../../shared/types";
import { overlaps } from "../lib/agenda";
import type { PlanCandidate } from "./candidates";
import { validateDayPlan } from "./validate";

const MIN_PICKS = 3;

function templateReason(candidate: PlanCandidate): string {
  const field =
    candidate.matched_field === "speakers"
      ? "the speaker"
      : candidate.matched_field === "speaker_text"
        ? "the speaker background"
        : "the session topic";
  const snippet = candidate.session.abstract.trim().slice(0, 120);
  const abstractBit = snippet ? ` The abstract mentions ${snippet}${snippet.length >= 120 ? "…" : "."}` : "";
  return `Matches your goal "${candidate.matched_goal}" through ${field} in ${candidate.session.title}.${abstractBit}`;
}

function daySessionIds(sessions: Map<string, Session>, day: string): Set<string> {
  const ids = new Set<string>();
  for (const session of sessions.values()) {
    if (session.start.slice(0, 10) === day) ids.add(session.id);
  }
  return ids;
}

/** Greedy non-overlapping picks when Claude or Elastic is unavailable. */
export function basicDayPlan(
  day: string,
  pacing: Pacing,
  candidates: PlanCandidate[],
  sessions: Map<string, Session>,
  pinned: PlanItem[],
): { items: PlanItem[]; breaks: PlanBreak[] } {
  const picks: { session_id: string; reason: string }[] = [];
  const scheduled: Session[] = pinned
    .map((item) => sessions.get(item.session_id))
    .filter((session): session is Session => Boolean(session));

  const ranked = [...candidates].sort(
    (a, b) =>
      b.score - a.score ||
      a.session.start.localeCompare(b.session.start) ||
      a.session.id.localeCompare(b.session.id),
  );

  for (const candidate of ranked) {
    if (pinned.some((item) => item.session_id === candidate.session.id)) continue;
    if (scheduled.some((other) => overlaps(candidate.session, other))) continue;
    picks.push({ session_id: candidate.session.id, reason: templateReason(candidate) });
    scheduled.push(candidate.session);
    if (picks.length >= 8) break;
  }

  if (picks.length < MIN_PICKS) {
    const fillers = [...sessions.values()]
      .filter((session) => session.start.slice(0, 10) === day && !session.all_access)
      .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
    for (const session of fillers) {
      if (picks.length >= MIN_PICKS) break;
      if (pinned.some((item) => item.session_id === session.id)) continue;
      if (picks.some((pick) => pick.session_id === session.id)) continue;
      if (scheduled.some((other) => overlaps(session, other))) continue;
      picks.push({
        session_id: session.id,
        reason: `On the agenda for this day: ${session.title}. Matches conference timing with room to move.`,
      });
      scheduled.push(session);
    }
  }

  const candidateIds = daySessionIds(sessions, day);
  for (const id of candidates.map((row) => row.session.id)) candidateIds.add(id);

  const validated = validateDayPlan(picks, [], {
    pacing,
    candidateIds,
    sessions,
    pinned,
  });
  return { items: validated.items, breaks: validated.breaks };
}
