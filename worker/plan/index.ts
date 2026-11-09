import type { MovedGoal, Plan, Profile, PlanBreak, PlanItem, Session, WorthIt } from "../../shared/types";
import type { Env } from "../env";
import { overlaps } from "../lib/agenda";
import { aiDayPlan } from "./ai";
import { ensureAgendaCache, getCachedSessions, sessionById } from "./agenda-cache";
import { basicDayPlan } from "./basic";
import { gatherCandidates } from "./candidates";
import { type RawPick, validateDayPlan } from "./validate";

export type PlanDay = Plan["days"][string];

/** What check-in learned. A "no" on moved_goal steers the real replan away from that topic. */
export interface ReplanSignal {
  session_id: string;
  worth_it: WorthIt;
  moved_goal: MovedGoal;
  note?: string;
}

function sessionsMap(rows: Session[]): Map<string, Session> {
  return new Map(rows.map((session) => [session.id, session]));
}

function pinnedFrom(day: PlanDay | undefined): PlanItem[] {
  if (!day) return [];
  return day.items.filter((item) => item.pinned);
}

function keptBeforeReplen(fromIso: string, items: PlanItem[]): PlanItem[] {
  const fromMs = Date.parse(fromIso);
  return items.filter((item) => {
    if (item.pinned || item.status === "done") return true;
    const session = sessionById(item.session_id);
    if (!session) return false;
    const endMs = Date.parse(session.end);
    return Number.isFinite(fromMs) && Number.isFinite(endMs) && endMs <= fromMs;
  });
}

function defaultBreaks(day: string, items: PlanItem[], sessions: Map<string, Session>): PlanBreak[] {
  const starts = items
    .map((item) => sessions.get(item.session_id))
    .filter((session): session is Session => Boolean(session))
    .sort((a, b) => a.end.localeCompare(b.end));
  const breaks: PlanBreak[] = [];
  for (let i = 0; i < starts.length - 1; i++) {
    const gapStart = starts[i].end;
    const gapEnd = starts[i + 1].start;
    if (Date.parse(gapEnd) - Date.parse(gapStart) >= 45 * 60_000) {
      breaks.push({
        start: gapStart,
        end: gapEnd,
        note: "Open time between sessions on the schedule.",
      });
    }
  }
  if (breaks.length === 0 && starts.length > 0) {
    breaks.push({
      start: `${day}T12:00:00-07:00`,
      end: `${day}T13:30:00-07:00`,
      note: "Lunch away from sessions.",
    });
  }
  return breaks.slice(0, 3);
}

async function buildDay(
  env: Env,
  profile: Profile,
  day: string,
  plan: Plan | undefined,
  pinned: PlanItem[],
  steerAwaySessionId?: string,
): Promise<{ day: PlanDay; source: "ai" | "basic" }> {
  const sessions = await ensureAgendaCache(env);
  const map = sessionsMap(sessions);
  const candidates = await gatherCandidates(env, profile, day, plan, steerAwaySessionId);

  const ai = await aiDayPlan(env, profile, candidates, map, pinned);
  if (ai?.usedAi && ai.items.length >= 3) {
    return {
      day: {
        items: ai.items,
        breaks: ai.breaks.length > 0 ? ai.breaks : defaultBreaks(day, ai.items, map),
      },
      source: "ai",
    };
  }

  const basic = basicDayPlan(candidates, map, pinned);
  const validated = validateDayPlan(
    basic.items
      .filter((item) => !item.pinned)
      .map((item) => ({ session_id: item.session_id, reason: item.reason }) satisfies RawPick),
    basic.breaks,
    {
      pacing: profile.pacing,
      candidateIds: new Set(candidates.map((row) => row.session.id)),
      sessions: map,
      pinned,
    },
  );

  const items = validated.items.length >= 1 ? validated.items : basic.items;
  const breaks = validated.breaks.length > 0 ? validated.breaks : defaultBreaks(day, items, map);

  return { day: { items, breaks }, source: "basic" };
}

/**
 * Generate or regenerate one conference day from the profile and agenda search.
 */
export async function generateDay(
  env: Env,
  profile: Profile,
  day: string,
  plan?: Plan,
): Promise<{ day: PlanDay; source: "ai" | "basic" }> {
  const pinned = pinnedFrom(plan?.days[day]);
  return buildDay(env, profile, day, plan, pinned);
}

/**
 * Re-plan only items after `from` on that day. Pinned and finished items stay.
 * Check-in calls this synchronously; it uses the warmed agenda cache.
 */
export function replanDay(profile: Profile, plan: Plan, day: string, from: string, signal: ReplanSignal): PlanDay {
  const current = plan.days[day] ?? { items: [], breaks: [] };
  const kept = keptBeforeReplen(from, current.items);
  const sessions = getCachedSessions().filter((row) => row.start.slice(0, 10) === day && !row.all_access);
  const map = sessionsMap(sessions);

  const steerAway = signal.moved_goal === "no" ? signal.session_id : undefined;
  const candidates = gatherCandidatesSync(profile, day, plan, sessions, steerAway);
  const basic = basicDayPlan(candidates, map, kept);

  const combined = validateDayPlan(
    basic.items
      .filter((item) => !kept.some((k) => k.session_id === item.session_id))
      .map((item) => ({ session_id: item.session_id, reason: item.reason }) satisfies RawPick),
    current.breaks,
    {
      pacing: profile.pacing,
      candidateIds: new Set(candidates.map((row) => row.session.id)),
      sessions: map,
      pinned: kept.filter((item) => item.pinned),
    },
  );

  const merged = [...kept];
  for (const item of combined.items) {
    if (merged.some((row) => row.session_id === item.session_id)) continue;
    const session = map.get(item.session_id);
    if (!session) continue;
    const clashes = merged.some((row) => {
      const other = map.get(row.session_id);
      return other ? overlaps(session, other) : false;
    });
    if (clashes) continue;
    merged.push(item);
  }

  const items = merged.sort((a, b) => {
    const aStart = map.get(a.session_id)?.start ?? "";
    const bStart = map.get(b.session_id)?.start ?? "";
    return aStart.localeCompare(bStart);
  });

  return {
    items,
    breaks: current.breaks.length > 0 ? current.breaks : defaultBreaks(day, items, map),
  };
}

function gatherCandidatesSync(
  profile: Profile,
  day: string,
  plan: Plan,
  sessions: Session[],
  steerAwaySessionId?: string,
): import("./candidates").PlanCandidate[] {
  const map = new Map<string, import("./candidates").PlanCandidate>();
  const tokenize = (text: string) => text.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 3);

  const add = (session: Session, score: number, matched_field: import("./candidates").MatchedField, matched_goal: string) => {
    const prev = map.get(session.id);
    const row = { session, score, matched_field, matched_goal };
    if (!prev || score > prev.score) map.set(session.id, row);
  };

  const onDay = sessions.filter((s) => s.start.slice(0, 10) === day);
  for (const goal of profile.goals) {
    const needles = tokenize(goal);
    for (const session of onDay) {
      const hay = `${session.search_text} ${session.title}`.toLowerCase();
      const score = needles.reduce((sum, needle) => (hay.includes(needle) ? sum + 1 : sum), 0);
      if (score > 0) add(session, score * 10, "search_text", goal);
    }
  }
  for (const expertise of profile.expertise_to_see) {
    const needles = tokenize(expertise);
    for (const session of onDay) {
      const hay = session.speaker_text.toLowerCase();
      const score = needles.reduce((sum, needle) => (hay.includes(needle) ? sum + 1 : sum), 0);
      if (score > 0) add(session, score * 8, "speaker_text", expertise);
    }
  }

  const ranked = [...map.values()]
    .filter((row) => !row.session.all_access)
    .filter((row) => {
      for (const [key, body] of Object.entries(plan.days)) {
        if (key === day) continue;
        if (body.items.some((item) => item.session_id === row.session.id && item.status !== "skipped")) return false;
      }
      return true;
    })
    .filter((row) => row.session.id !== steerAwaySessionId)
    .sort((a, b) => b.score - a.score || a.session.start.localeCompare(b.session.start));

  return ranked.slice(0, 60);
}
