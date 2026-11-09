import { GOAL_THEMES, isGoalTheme } from "../../shared/event";
import type { CheckIn, IsoDateTime, Plan, Profile, Readout } from "../../shared/types";
import type { Env } from "../env";
import { getSession } from "../lib/agenda";
import { claudeJson } from "../lib/claude";
import { toConferenceIso } from "../plan/time";
import { HttpError } from "../lib/http";

const FALLBACK_LABEL = "Summary built from your check-ins (AI unavailable).";
const NOT_ENOUGH = "Not enough feedback to tell";

export function helpedSessionIds(checkins: CheckIn[], resolvableSessionIds: ReadonlySet<string>): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const row of checkins) {
    if (row.moved_goal !== "yes" && row.moved_goal !== "a_little") continue;
    if (!resolvableSessionIds.has(row.session_id)) continue;
    if (seen.has(row.session_id)) continue;
    seen.add(row.session_id);
    ids.push(row.session_id);
  }
  return ids;
}

export function hasPositiveMovedGoal(checkins: CheckIn[]): boolean {
  return checkins.some((c) => c.moved_goal === "yes" || c.moved_goal === "a_little");
}

export function hasNegativeMovedGoal(checkins: CheckIn[]): boolean {
  return checkins.some((c) => c.moved_goal === "no");
}

/** Goals lists stay empty when check-ins do not support hit/miss claims. */
export function enforceGoalEvidence(
  checkins: CheckIn[],
  goals_hit: string[],
  goals_missed: string[],
): { goals_hit: string[]; goals_missed: string[] } {
  let hit = goals_hit;
  let missed = goals_missed;
  if (!hasPositiveMovedGoal(checkins)) hit = [];
  if (!hasNegativeMovedGoal(checkins)) missed = [];
  if (hit.length === 0) return { goals_hit: hit, goals_missed: missed };
  const hitSet = new Set(hit);
  return { goals_hit: hit, goals_missed: missed.filter((g) => !hitSet.has(g)) };
}

/** Latest end time among planned sessions and breaks. Uses Date.parse. */
export function lastPlannedBlockEndMs(plan: Plan, sessionEndById: ReadonlyMap<string, string>): number | null {
  let max: number | null = null;
  const consider = (iso: string) => {
    const ms = Date.parse(iso);
    if (!Number.isFinite(ms)) return;
    if (max === null || ms > max) max = ms;
  };
  for (const day of Object.values(plan.days)) {
    for (const item of day.items) {
      const end = sessionEndById.get(item.session_id);
      if (end) consider(end);
    }
    for (const br of day.breaks) consider(br.end);
  }
  return max;
}

export function isReadoutFinal(asOfMs: number, plan: Plan, sessionEndById: ReadonlyMap<string, string>): boolean {
  const end = lastPlannedBlockEndMs(plan, sessionEndById);
  if (end === null) return false;
  return asOfMs >= end;
}

const STOP = new Set([
  "about",
  "after",
  "also",
  "from",
  "into",
  "that",
  "the",
  "this",
  "what",
  "when",
  "with",
  "your",
  "you",
  "and",
  "for",
  "are",
  "how",
  "get",
  "not",
  "our",
]);

function keywords(text: string): Set<string> {
  const out = new Set<string>();
  for (const word of text.toLowerCase().split(/[^a-z0-9]+/)) {
    if (word.length < 4 || STOP.has(word)) continue;
    out.add(word);
  }
  return out;
}

function sessionRelatesToGoal(sessionId: string, goal: string, sessionTextById: ReadonlyMap<string, string>): boolean {
  const blob = sessionTextById.get(sessionId);
  if (!blob) return false;
  const goalKeys = keywords(goal);
  if (goalKeys.size === 0) return false;
  const sessionKeys = keywords(blob);
  for (const key of goalKeys) {
    if (sessionKeys.has(key)) return true;
  }
  return false;
}

function filterGoalThemes(candidates: string[] | undefined): string[] {
  if (!candidates?.length) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of candidates) {
    if (!isGoalTheme(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function alignGoals(candidates: string[], allowed: readonly string[]): string[] {
  const set = new Set(allowed);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const goal of candidates) {
    if (!set.has(goal) || seen.has(goal)) continue;
    seen.add(goal);
    out.push(goal);
  }
  return out;
}

function inferGapThemes(profile: Profile, goalsMissed: string[]): string[] {
  const fromProfile = filterGoalThemes(profile.goal_themes);
  if (fromProfile.length > 0 && goalsMissed.length > 0) return fromProfile.slice(0, 3);

  const guessed: string[] = [];
  for (const goal of goalsMissed) {
    const lower = goal.toLowerCase();
    for (const theme of GOAL_THEMES) {
      if (guessed.includes(theme.id)) continue;
      const label = theme.label.toLowerCase();
      if (lower.includes(label) || keywords(goal).has(theme.id.split("-")[0] ?? "")) {
        guessed.push(theme.id);
      }
    }
  }
  return filterGoalThemes(guessed);
}

function buildTeamRecap(
  profile: Profile,
  goalsHit: string[],
  goalsMissed: string[],
  helped: string[],
  sessionTextById: ReadonlyMap<string, string>,
  checkinCount: number,
): string {
  if (checkinCount === 0) {
    return "I came to the conference with clear goals. I have not checked in on sessions yet, so this recap stays provisional.";
  }
  const parts: string[] = [];
  if (goalsHit.length > 0) {
    parts.push(`Moved forward: ${goalsHit.map((g) => g.replace(/\.$/, "")).join("; ")}.`);
  }
  if (goalsMissed.length > 0) {
    parts.push(`Still open: ${goalsMissed.map((g) => g.replace(/\.$/, "")).join("; ")}.`);
  }
  if (helped.length > 0) {
    const names = helped
      .map((id) => sessionTextById.get(id)?.split("|")[0]?.trim())
      .filter((t): t is string => Boolean(t))
      .slice(0, 3);
    if (names.length > 0) parts.push(`Sessions that helped: ${names.join(", ")}.`);
  }
  if (parts.length === 0) {
    return `${profile.role || "I"} attended with goals around ${profile.goals[0]?.replace(/\.$/, "") ?? "the conference"}. Check-ins are in; goal progress is mixed.`;
  }
  return parts.join(" ");
}

function nextPlannedSession(plan: Plan): { session_id: string; reason: string } | null {
  for (const day of Object.keys(plan.days).sort()) {
    const block = plan.days[day];
    if (!block) continue;
    for (const item of block.items) {
      if (item.status === "planned") return { session_id: item.session_id, reason: item.reason };
    }
  }
  return null;
}

function buildFollowups(
  plan: Plan,
  goalsMissed: string[],
  sessionTextById: ReadonlyMap<string, string>,
  final: boolean,
): string[] {
  const followups: string[] = [];
  if (!final) {
    const next = nextPlannedSession(plan);
    if (next) {
      const title = sessionTextById.get(next.session_id)?.split("|")[0]?.trim() ?? "your next planned session";
      const room = next.reason.match(/Grand Ballroom|room \d+/i)?.[0];
      followups.push(
        room
          ? `Check in after ${title} (${room}) while the takeaways are fresh.`
          : `Check in after ${title} while the takeaways are fresh.`,
      );
    }
  }
  if (goalsMissed.length > 0) {
    const topic = goalsMissed[0]!.replace(/\.$/, "");
    followups.push(`Pick one follow-up on ${topic} to try within two weeks of getting home.`);
  }
  followups.push("Send your manager a short recap of what moved and what is still open.");
  return followups.slice(0, 4);
}

export interface ReadoutInputs {
  attendeeId: string;
  profile: Profile;
  plan: Plan;
  checkins: CheckIn[];
  asOf: Date;
  sessionTextById: ReadonlyMap<string, string>;
  sessionEndById: ReadonlyMap<string, string>;
}

export function buildFallbackReadout(input: ReadoutInputs): Readout {
  const { attendeeId, profile, plan, checkins, asOf, sessionTextById, sessionEndById } = input;
  const as_of = toConferenceIso(asOf);
  const asOfMs = Date.parse(as_of);
  const final = Number.isFinite(asOfMs) && isReadoutFinal(asOfMs, plan, sessionEndById);
  const resolvable = new Set(sessionTextById.keys());
  const helped_sessions = helpedSessionIds(checkins, resolvable);

  let goals_hit: string[] = [];
  let goals_missed: string[] = [];
  const gaps: string[] = [FALLBACK_LABEL];

  if (checkins.length === 0) {
    for (const goal of profile.goals) {
      gaps.push(`${NOT_ENOUGH}: ${goal.replace(/\.$/, "")}`);
    }
  } else {
    for (const goal of profile.goals) {
      const positive = checkins.some(
        (c) =>
          (c.moved_goal === "yes" || c.moved_goal === "a_little") && sessionRelatesToGoal(c.session_id, goal, sessionTextById),
      );
      const negative = checkins.some((c) => c.moved_goal === "no" && sessionRelatesToGoal(c.session_id, goal, sessionTextById));
      if (positive) goals_hit.push(goal);
      else if (negative) goals_missed.push(goal);
      else gaps.push(`${NOT_ENOUGH}: ${goal.replace(/\.$/, "")}`);
    }
    ({ goals_hit, goals_missed } = enforceGoalEvidence(checkins, goals_hit, goals_missed));
  }

  const gap_themes = inferGapThemes(profile, goals_missed);
  const recap = buildTeamRecap(profile, goals_hit, goals_missed, helped_sessions, sessionTextById, checkins.length);
  const followups = [recap, ...buildFollowups(plan, goals_missed, sessionTextById, final)];

  return {
    attendee_id: attendeeId,
    as_of,
    final,
    goals_hit,
    goals_missed,
    helped_sessions,
    gaps,
    gap_themes,
    followups,
  };
}

interface ClaudeReadoutDraft {
  goals_hit?: string[];
  goals_missed?: string[];
  gaps?: string[];
  gap_themes?: string[];
  followups?: string[];
  team_recap?: string;
}

const READOUT_SCHEMA = {
  type: "object",
  properties: {
    goals_hit: { type: "array", items: { type: "string" } },
    goals_missed: { type: "array", items: { type: "string" } },
    gaps: { type: "array", items: { type: "string" } },
    gap_themes: { type: "array", items: { type: "string" } },
    followups: { type: "array", items: { type: "string" } },
    team_recap: { type: "string" },
  },
  required: ["goals_hit", "goals_missed", "gaps", "gap_themes", "followups", "team_recap"],
  additionalProperties: false,
};

function trimLines(values: unknown, max: number, maxLen: number): string[] {
  if (!Array.isArray(values)) return [];
  const out: string[] = [];
  for (const value of values) {
    if (typeof value !== "string") continue;
    const line = value.trim().slice(0, maxLen);
    if (!line) continue;
    out.push(line);
    if (out.length >= max) break;
  }
  return out;
}

function validateClaudeReadout(
  draft: ClaudeReadoutDraft,
  profile: Profile,
  checkins: CheckIn[],
  helped_sessions: string[],
): Omit<Readout, "attendee_id" | "as_of" | "final"> | null {
  let { goals_hit, goals_missed } = enforceGoalEvidence(
    checkins,
    alignGoals(trimLines(draft.goals_hit, 3, 400), profile.goals),
    alignGoals(trimLines(draft.goals_missed, 3, 400), profile.goals),
  );

  let gaps = trimLines(draft.gaps, 6, 500);
  if (gaps.length === 0) gaps = ["Some goals still lack enough session feedback to judge."];

  const gap_themes = filterGoalThemes(draft.gap_themes);
  let followups = trimLines(draft.followups, 4, 500);
  const recap = typeof draft.team_recap === "string" ? draft.team_recap.trim().slice(0, 600) : "";
  if (recap) followups = [recap, ...followups.filter((f) => f !== recap)];
  if (followups.length === 0) {
    followups = ["Share what moved your goals with your team while the notes are still fresh."];
  }

  return {
    goals_hit,
    goals_missed,
    helped_sessions,
    gaps,
    gap_themes,
    followups,
  };
}

function checkinSummary(checkins: CheckIn[], sessionTextById: ReadonlyMap<string, string>): string {
  const lines: string[] = [];
  for (const row of checkins) {
    const title = sessionTextById.get(row.session_id)?.split("|")[0]?.trim() ?? row.session_id;
    lines.push(`- ${title}: worth_it=${row.worth_it}, moved_goal=${row.moved_goal}`);
  }
  return lines.join("\n");
}

async function sessionMaps(
  env: Env,
  plan: Plan,
  checkins: CheckIn[],
): Promise<{ sessionTextById: Map<string, string>; sessionEndById: Map<string, string> }> {
  const ids = new Set<string>();
  for (const day of Object.values(plan.days)) {
    for (const item of day.items) ids.add(item.session_id);
  }
  for (const row of checkins) ids.add(row.session_id);
  const sessionTextById = new Map<string, string>();
  const sessionEndById = new Map<string, string>();
  for (const id of ids) {
    const session = await getSession(env, id);
    if (!session) continue;
    sessionTextById.set(id, `${session.title}|${session.track}|${session.search_text.slice(0, 120)}`);
    sessionEndById.set(id, session.end);
  }
  return { sessionTextById, sessionEndById };
}

export interface GeneratedReadout {
  readout: Readout;
  /** True when the deterministic fallback was used instead of Claude. */
  stub: boolean;
}

export async function generateReadout(
  env: Env,
  attendeeId: string,
  profile: Profile,
  plan: Plan,
  checkins: CheckIn[],
  asOf: Date,
): Promise<GeneratedReadout> {
  const { sessionTextById, sessionEndById } = await sessionMaps(env, plan, checkins);
  const baseInput: ReadoutInputs = {
    attendeeId,
    profile,
    plan,
    checkins,
    asOf,
    sessionTextById,
    sessionEndById,
  };

  const helped_sessions = helpedSessionIds(checkins, new Set(sessionTextById.keys()));
  const as_of: IsoDateTime = toConferenceIso(asOf);
  const asOfMs = Date.parse(as_of);
  const final = Number.isFinite(asOfMs) && isReadoutFinal(asOfMs, plan, sessionEndById);

  if (!env.ANTHROPIC_API_KEY) {
    return { readout: buildFallbackReadout(baseInput), stub: true };
  }

  const system = [
    "You write an honest post-conference readout for one attendee.",
    "Use only the goals and check-in signals given. Do not invent sessions or claim a goal moved without check-in support.",
    'For goals with no relevant check-in, put a gap line that starts with "Not enough feedback to tell".',
    "gap_themes must use only the theme ids provided.",
    "team_recap is a short manager-ready paragraph in plain language, no scores or percentages.",
    "followups must be concrete next steps, at least one.",
    "Reply with the JSON schema only.",
  ].join(" ");

  const themeIds = GOAL_THEMES.map((t) => t.id).join(", ");
  const user = [
    `Goals:\n${profile.goals.map((g, i) => `${i + 1}. ${g}`).join("\n")}`,
    `Check-ins (${checkins.length}):\n${checkins.length ? checkinSummary(checkins, sessionTextById) : "(none yet)"}`,
    `Helped session ids already computed in code: ${helped_sessions.join(", ") || "none"}`,
    `Allowed gap_theme ids: ${themeIds}`,
    `Conference ${final ? "is past the last planned block" : "is still in progress (heading may say so far)"}.`,
  ].join("\n\n");

  try {
    const draft = await claudeJson<ClaudeReadoutDraft>(env, {
      system,
      user,
      schema: READOUT_SCHEMA,
      maxTokens: 900,
      timeoutMs: 15_000,
    });
    const validated = validateClaudeReadout(draft, profile, checkins, helped_sessions);
    if (!validated) {
      return { readout: buildFallbackReadout(baseInput), stub: true };
    }
    return {
      readout: {
        attendee_id: attendeeId,
        as_of,
        final,
        ...validated,
      },
      stub: false,
    };
  } catch (err) {
    if (!(err instanceof HttpError)) {
      console.error("readout_generate", { name: err instanceof Error ? err.name : "unknown" });
    }
    return { readout: buildFallbackReadout(baseInput), stub: true };
  }
}
