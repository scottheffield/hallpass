import type { Plan, Profile, Session } from "../../shared/types";
import type { Env } from "../env";
import { searchSessions } from "../lib/search";
import { ensureAgendaCache } from "./agenda-cache";

export type MatchedField = "search_text" | "speaker_text" | "speakers";

export interface PlanCandidate {
  session: Session;
  score: number;
  matched_field: MatchedField;
  matched_goal: string;
}

const CAP = 60;
const MIN_CAP = 30;

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function speakerMatch(speakers: string[], people: string[]): string | null {
  for (const person of people) {
    const needle = normalize(person);
    if (!needle) continue;
    for (const speaker of speakers) {
      if (normalize(speaker).includes(needle) || needle.includes(normalize(speaker))) {
        return person;
      }
    }
  }
  return null;
}

function mergeCandidate(map: Map<string, PlanCandidate>, next: PlanCandidate): void {
  const prev = map.get(next.session.id);
  if (!prev || next.score > prev.score) map.set(next.session.id, next);
}

function plannedOnOtherDays(plan: Plan | undefined, day: string, sessionId: string): boolean {
  if (!plan) return false;
  for (const [key, body] of Object.entries(plan.days)) {
    if (key === day) continue;
    if (body.items.some((item) => item.session_id === sessionId && item.status !== "skipped")) return true;
  }
  return false;
}

function steerAwayTopics(signalSessionId: string | undefined, sessions: Session[]): Set<string> {
  const blocked = new Set<string>();
  if (!signalSessionId) return blocked;
  const session = sessions.find((item) => item.id === signalSessionId);
  if (!session) return blocked;
  const titleTokens = session.title.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 4);
  for (const row of sessions) {
    if (row.id === signalSessionId) {
      blocked.add(row.id);
      continue;
    }
    const hay = `${row.title} ${row.track} ${row.search_text}`.toLowerCase();
    if (titleTokens.some((token) => hay.includes(token))) blocked.add(row.id);
  }
  return blocked;
}

/** Search goals, expertise, and named speakers. Dedupe, cap, and drop all-day blocks. */
export async function gatherCandidates(
  env: Env,
  profile: Profile,
  day: string,
  plan?: Plan,
  steerAwaySessionId?: string,
): Promise<PlanCandidate[]> {
  const sessions = await ensureAgendaCache(env);
  const blocked = steerAwayTopics(steerAwaySessionId, sessions);
  const map = new Map<string, PlanCandidate>();

  for (const goal of profile.goals) {
    if (!goal.trim()) continue;
    const result = await searchSessions(env, { text: goal, field: "search_text", day, size: 25 });
    for (const hit of result.hits) {
      mergeCandidate(map, {
        session: hit.session,
        score: hit.score * 10,
        matched_field: "search_text",
        matched_goal: goal,
      });
    }
  }

  for (const expertise of profile.expertise_to_see) {
    if (!expertise.trim()) continue;
    const result = await searchSessions(env, { text: expertise, field: "speaker_text", day, size: 20 });
    for (const hit of result.hits) {
      mergeCandidate(map, {
        session: hit.session,
        score: hit.score * 8,
        matched_field: "speaker_text",
        matched_goal: expertise,
      });
    }
  }

  if (profile.people_to_see.length > 0) {
    const onDay = sessions.filter((session) => session.start.slice(0, 10) === day && !session.all_access);
    for (const session of onDay) {
      const person = speakerMatch(session.speakers, profile.people_to_see);
      if (!person) continue;
      mergeCandidate(map, {
        session,
        score: 100,
        matched_field: "speakers",
        matched_goal: person,
      });
    }
  }

  const ranked = [...map.values()]
    .filter((row) => !row.session.all_access)
    .filter((row) => !plannedOnOtherDays(plan, day, row.session.id))
    .filter((row) => !blocked.has(row.session.id))
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.session.start.localeCompare(b.session.start) ||
        a.session.id.localeCompare(b.session.id),
    );

  const limit = Math.min(CAP, Math.max(MIN_CAP, ranked.length));
  return ranked.slice(0, limit);
}

export function candidateBrief(candidate: PlanCandidate): string {
  const abstract = candidate.session.abstract.slice(0, 600);
  return [
    `id=${candidate.session.id}`,
    `title=${candidate.session.title}`,
    `time=${candidate.session.start} to ${candidate.session.end}`,
    `room=${candidate.session.room}`,
    `track=${candidate.session.track}`,
    `matched=${candidate.matched_field} on "${candidate.matched_goal}"`,
    `abstract=${abstract}`,
  ].join("\n");
}
