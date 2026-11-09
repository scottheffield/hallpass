import { GOAL_THEMES, isGoalTheme } from "../../shared/event";
import type { CheckIn, IsoDateTime, Plan, Profile, Readout } from "../../shared/types";
import { goalForPlanReason, goalsReferToSameTopic } from "../checkin/goal";
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

function checkinSupportsGoal(
  checkin: CheckIn,
  goal: string,
  plan: Plan,
  profileGoals: readonly string[],
  sessionTextById: ReadonlyMap<string, string>,
): boolean {
  const planned = plannedGoalForSession(plan, checkin.session_id, profileGoals);
  if (planned) return goalsReferToSameTopic(planned, goal);
  return sessionRelatesToGoal(checkin.session_id, goal, sessionTextById);
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

export type GoalProgressStatus = "hit" | "missed" | "unclear";

/** Goal cards always use profile goal strings verbatim. */
export function goalListsFromProfile(
  profile: Profile,
  statusByIndex: ReadonlyMap<number, GoalProgressStatus>,
): { goals_hit: string[]; goals_missed: string[]; unclear: string[] } {
  const goals_hit: string[] = [];
  const goals_missed: string[] = [];
  const unclear: string[] = [];
  for (let index = 0; index < profile.goals.length; index++) {
    const goal = profile.goals[index]!;
    const status = statusByIndex.get(index) ?? "unclear";
    if (status === "hit") goals_hit.push(goal);
    else if (status === "missed") goals_missed.push(goal);
    else unclear.push(goal);
  }
  return { goals_hit, goals_missed, unclear };
}

export function plannedGoalForSession(plan: Plan, sessionId: string, profileGoals: readonly string[]): string | null {
  for (const day of Object.values(plan.days)) {
    const item = day.items.find((row) => row.session_id === sessionId);
    if (item) return goalForPlanReason(item.reason, profileGoals);
  }
  return null;
}

function formatAgendaTime(iso: string): string {
  const match = /T(\d{2}):(\d{2})/.exec(iso);
  if (!match) return "";
  const hour = Number(match[1]);
  const minute = match[2];
  if (minute === "00") return String(hour);
  return `${hour}:${minute}`;
}

export interface NextStepPick {
  session_id: string;
  goal_index: number;
  title: string;
  time: string;
  room: string;
}

export function pickNextStepSessions(
  plan: Plan,
  profile: Profile,
  openGoalIndices: readonly number[],
  asOfMs: number,
  sessionMetaById: ReadonlyMap<string, { title: string; start: string; room: string }>,
  agendaIds: ReadonlySet<string>,
  maxPerGoal = 2,
): NextStepPick[] {
  const picks: NextStepPick[] = [];
  const used = new Set<string>();

  for (const goalIndex of openGoalIndices) {
    const goal = profile.goals[goalIndex];
    if (!goal) continue;
    const forGoal: NextStepPick[] = [];
    const days = Object.keys(plan.days).sort();
    for (const day of days) {
      const block = plan.days[day];
      if (!block) continue;
      for (const item of block.items) {
        if (item.status !== "planned") continue;
        if (!agendaIds.has(item.session_id) || used.has(item.session_id)) continue;
        const served = goalForPlanReason(item.reason, profile.goals);
        if (!served || !goalsReferToSameTopic(served, goal)) continue;
        const meta = sessionMetaById.get(item.session_id);
        if (!meta) continue;
        const startMs = Date.parse(meta.start);
        if (Number.isFinite(asOfMs) && Number.isFinite(startMs) && startMs < asOfMs) continue;
        forGoal.push({
          session_id: item.session_id,
          goal_index: goalIndex,
          title: meta.title,
          time: formatAgendaTime(meta.start),
          room: meta.room,
        });
      }
    }
    forGoal.sort((a, b) => a.time.localeCompare(b.time) || a.session_id.localeCompare(b.session_id));
    for (const row of forGoal.slice(0, maxPerGoal)) {
      used.add(row.session_id);
      picks.push(row);
    }
  }
  return picks;
}

export function formatNextStepLine(pick: NextStepPick, reason: string): string {
  const timePhrase = pick.time ? ` at ${pick.time}` : "";
  const roomPhrase = pick.room ? ` in ${pick.room}` : "";
  const detail = reason.trim().replace(/\.$/, "");
  return `Attend ${pick.title}${timePhrase}${roomPhrase}: ${detail}.`;
}

function fallbackNextStepReason(pick: NextStepPick, profile: Profile): string {
  const goal = profile.goals[pick.goal_index]?.replace(/\.$/, "") ?? "your goal";
  return `still addresses ${goal}`;
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

function buildFollowups(
  plan: Plan,
  profile: Profile,
  openGoalIndices: number[],
  asOfMs: number,
  sessionMetaById: ReadonlyMap<string, { title: string; start: string; room: string }>,
  agendaIds: ReadonlySet<string>,
  final: boolean,
): string[] {
  const followups: string[] = [];
  const picks = pickNextStepSessions(plan, profile, openGoalIndices, asOfMs, sessionMetaById, agendaIds);
  for (const pick of picks) {
    followups.push(formatNextStepLine(pick, fallbackNextStepReason(pick, profile)));
  }
  if (!final && picks.length === 0) {
    followups.push("Check in after your next planned session while the takeaways are fresh.");
  }
  followups.push("Send your manager a short recap of what moved and what is still open.");
  return followups.slice(0, 5);
}

function openGoalIndicesFromLists(profile: Profile, goals_hit: string[], goals_missed: string[]): number[] {
  const hit = new Set(goals_hit);
  const missed = new Set(goals_missed);
  const indices: number[] = [];
  profile.goals.forEach((goal, index) => {
    if (missed.has(goal) || (!hit.has(goal) && !missed.has(goal))) indices.push(index);
  });
  return indices;
}

export interface ReadoutInputs {
  attendeeId: string;
  profile: Profile;
  plan: Plan;
  checkins: CheckIn[];
  asOf: Date;
  sessionTextById: ReadonlyMap<string, string>;
  sessionEndById: ReadonlyMap<string, string>;
  sessionMetaById: ReadonlyMap<string, { title: string; start: string; room: string }>;
}

export function buildFallbackReadout(input: ReadoutInputs): Readout {
  const { attendeeId, profile, plan, checkins, asOf, sessionTextById, sessionEndById, sessionMetaById } = input;
  const as_of = toConferenceIso(asOf);
  const asOfMs = Date.parse(as_of);
  const final = Number.isFinite(asOfMs) && isReadoutFinal(asOfMs, plan, sessionEndById);
  const resolvable = new Set(sessionTextById.keys());
  const helped_sessions = helpedSessionIds(checkins, resolvable);

  const statusByIndex = new Map<number, GoalProgressStatus>();
  const gaps: string[] = [FALLBACK_LABEL];

  if (checkins.length === 0) {
    for (let index = 0; index < profile.goals.length; index++) statusByIndex.set(index, "unclear");
  } else {
    for (let index = 0; index < profile.goals.length; index++) {
      const goal = profile.goals[index]!;
      const positive = checkins.some(
        (c) =>
          (c.moved_goal === "yes" || c.moved_goal === "a_little") &&
          checkinSupportsGoal(c, goal, plan, profile.goals, sessionTextById),
      );
      const negative = checkins.some(
        (c) => c.moved_goal === "no" && checkinSupportsGoal(c, goal, plan, profile.goals, sessionTextById),
      );
      if (positive) statusByIndex.set(index, "hit");
      else if (negative) statusByIndex.set(index, "missed");
      else statusByIndex.set(index, "unclear");
    }
  }

  let { goals_hit, goals_missed, unclear } = goalListsFromProfile(profile, statusByIndex);
  ({ goals_hit, goals_missed } = enforceGoalEvidence(checkins, goals_hit, goals_missed));
  if (checkins.length > 0) {
    unclear = profile.goals.filter((goal) => !goals_hit.includes(goal) && !goals_missed.includes(goal));
  }
  for (const goal of unclear) {
    gaps.push(`${NOT_ENOUGH}: ${goal.replace(/\.$/, "")}`);
  }

  const gap_themes = inferGapThemes(profile, goals_missed);
  const recap = buildTeamRecap(profile, goals_hit, goals_missed, helped_sessions, sessionTextById, checkins.length);
  const openIndices = openGoalIndicesFromLists(profile, goals_hit, goals_missed);
  const followups = [
    recap,
    ...buildFollowups(plan, profile, openIndices, asOfMs, sessionMetaById, resolvable, final),
  ];

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

interface ClaudeGoalStatus {
  goal?: number;
  status?: string;
}

interface ClaudeNextStepReason {
  session_id?: string;
  reason?: string;
}

interface ClaudeReadoutDraft {
  goal_status?: ClaudeGoalStatus[];
  gaps?: string[];
  gap_themes?: string[];
  next_step_reasons?: ClaudeNextStepReason[];
  team_recap?: string;
}

const READOUT_SCHEMA = {
  type: "object",
  properties: {
    goal_status: {
      type: "array",
      items: {
        type: "object",
        properties: {
          goal: { type: "integer" },
          status: { type: "string", enum: ["hit", "missed", "unclear"] },
        },
        required: ["goal", "status"],
        additionalProperties: false,
      },
    },
    gaps: { type: "array", items: { type: "string" } },
    gap_themes: { type: "array", items: { type: "string" } },
    next_step_reasons: {
      type: "array",
      items: {
        type: "object",
        properties: {
          session_id: { type: "string" },
          reason: { type: "string" },
        },
        required: ["session_id", "reason"],
        additionalProperties: false,
      },
    },
    team_recap: { type: "string" },
  },
  required: ["goal_status", "gaps", "gap_themes", "next_step_reasons", "team_recap"],
  additionalProperties: false,
};

function parseGoalStatusDraft(draft: ClaudeReadoutDraft, profile: Profile): Map<number, GoalProgressStatus> {
  const statusByIndex = new Map<number, GoalProgressStatus>();
  const rows = Array.isArray(draft.goal_status) ? draft.goal_status : [];
  for (const row of rows) {
    const goal =
      typeof row.goal === "number"
        ? row.goal
        : typeof row.goal === "string" && /^\d+$/.test(row.goal)
          ? Number(row.goal)
          : NaN;
    const status = row.status;
    if (!Number.isInteger(goal) || goal < 0 || goal >= profile.goals.length) continue;
    if (status !== "hit" && status !== "missed" && status !== "unclear") continue;
    statusByIndex.set(goal, status);
  }
  for (let index = 0; index < profile.goals.length; index++) {
    if (!statusByIndex.has(index)) statusByIndex.set(index, "unclear");
  }
  return statusByIndex;
}

function nextStepReasonsById(draft: ClaudeReadoutDraft): Map<string, string> {
  const map = new Map<string, string>();
  if (!Array.isArray(draft.next_step_reasons)) return map;
  for (const row of draft.next_step_reasons) {
    if (typeof row.session_id !== "string" || typeof row.reason !== "string") continue;
    const id = row.session_id.trim();
    const reason = row.reason.trim();
    if (!id || !reason) continue;
    map.set(id, reason.slice(0, 300));
  }
  return map;
}

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
  plan: Plan,
  checkins: CheckIn[],
  helped_sessions: string[],
  asOfMs: number,
  sessionMetaById: ReadonlyMap<string, { title: string; start: string; room: string }>,
  agendaIds: ReadonlySet<string>,
  final: boolean,
): Omit<Readout, "attendee_id" | "as_of" | "final"> | null {
  const statusByIndex = parseGoalStatusDraft(draft, profile);
  let { goals_hit, goals_missed, unclear } = goalListsFromProfile(profile, statusByIndex);
  ({ goals_hit, goals_missed } = enforceGoalEvidence(checkins, goals_hit, goals_missed));
  unclear = profile.goals.filter((goal) => !goals_hit.includes(goal) && !goals_missed.includes(goal));

  const gaps = trimLines(draft.gaps, 6, 500).filter((line) => {
    const lower = line.toLowerCase();
    return !profile.goals.some((goal) => lower.includes(goal.slice(0, 24).toLowerCase()));
  });
  for (const goal of unclear) {
    gaps.push(`${NOT_ENOUGH}: ${goal.replace(/\.$/, "")}`);
  }
  if (gaps.length === 0) gaps.push(FALLBACK_LABEL);

  const gap_themes = filterGoalThemes(draft.gap_themes);
  const recap = typeof draft.team_recap === "string" ? draft.team_recap.trim().slice(0, 600) : "";
  const openIndices = openGoalIndicesFromLists(profile, goals_hit, goals_missed);
  const picks = pickNextStepSessions(plan, profile, openIndices, asOfMs, sessionMetaById, agendaIds);
  const reasons = nextStepReasonsById(draft);
  const nextSteps = picks.map((pick) =>
    formatNextStepLine(pick, reasons.get(pick.session_id) ?? fallbackNextStepReason(pick, profile)),
  );
  let followups = recap ? [recap, ...nextSteps] : [...nextSteps];
  if (!final && nextSteps.length === 0) {
    followups.push("Check in after your next planned session while the takeaways are fresh.");
  }
  followups.push("Send your manager a short recap of what moved and what is still open.");
  followups = followups.slice(0, 5);
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

function checkinSummary(
  checkins: CheckIn[],
  plan: Plan,
  profileGoals: readonly string[],
  sessionTextById: ReadonlyMap<string, string>,
): string {
  const lines: string[] = [];
  for (const row of checkins) {
    const title = sessionTextById.get(row.session_id)?.split("|")[0]?.trim() ?? row.session_id;
    const plannedGoal = plannedGoalForSession(plan, row.session_id, profileGoals);
    const goalBit = plannedGoal ? `, planned_goal="${plannedGoal.replace(/"/g, "'")}"` : "";
    lines.push(`- ${title}: worth_it=${row.worth_it}, moved_goal=${row.moved_goal}${goalBit}`);
  }
  return lines.join("\n");
}

async function sessionMaps(
  env: Env,
  plan: Plan,
  checkins: CheckIn[],
): Promise<{
  sessionTextById: Map<string, string>;
  sessionEndById: Map<string, string>;
  sessionMetaById: Map<string, { title: string; start: string; room: string }>;
}> {
  const ids = new Set<string>();
  for (const day of Object.values(plan.days)) {
    for (const item of day.items) ids.add(item.session_id);
  }
  for (const row of checkins) ids.add(row.session_id);
  const sessionTextById = new Map<string, string>();
  const sessionEndById = new Map<string, string>();
  const sessionMetaById = new Map<string, { title: string; start: string; room: string }>();
  for (const id of ids) {
    const session = await getSession(env, id);
    if (!session) continue;
    sessionTextById.set(id, `${session.title}|${session.track}|${session.search_text.slice(0, 120)}`);
    sessionEndById.set(id, session.end);
    sessionMetaById.set(id, { title: session.title, start: session.start, room: session.room });
  }
  return { sessionTextById, sessionEndById, sessionMetaById };
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
  const { sessionTextById, sessionEndById, sessionMetaById } = await sessionMaps(env, plan, checkins);
  const baseInput: ReadoutInputs = {
    attendeeId,
    profile,
    plan,
    checkins,
    asOf,
    sessionTextById,
    sessionEndById,
    sessionMetaById,
  };

  const helped_sessions = helpedSessionIds(checkins, new Set(sessionTextById.keys()));
  const as_of: IsoDateTime = toConferenceIso(asOf);
  const asOfMs = Date.parse(as_of);
  const final = Number.isFinite(asOfMs) && isReadoutFinal(asOfMs, plan, sessionEndById);

  if (!env.ANTHROPIC_API_KEY) {
    return { readout: buildFallbackReadout(baseInput), stub: true };
  }

  const openIndices = openGoalIndicesFromLists(profile, [], []);
  const nextStepPicks = pickNextStepSessions(
    plan,
    profile,
    openIndices.length > 0 ? openIndices : profile.goals.map((_, index) => index),
    asOfMs,
    sessionMetaById,
    new Set(sessionTextById.keys()),
  );

  const system = [
    "You write an honest post-conference readout for one attendee.",
    "goal_status uses 0-based indexes into the Goals list only. Never invent goal text.",
    "Use planned_goal on each check-in to judge which goal a session served.",
    "Do not claim a goal moved without check-in support. Use status unclear when feedback is missing.",
    "gaps are for non-goal themes only; do not repeat profile goal sentences.",
    "gap_themes must use only the theme ids provided.",
    "next_step_reasons: one short reason per session_id from the Next steps list. Do not change session ids.",
    "team_recap is a short manager-ready paragraph in plain language, no scores or percentages.",
    "Reply with the JSON schema only.",
  ].join(" ");

  const themeIds = GOAL_THEMES.map((t) => t.id).join(", ");
  const user = [
    `Goals:\n${profile.goals.map((g, i) => `${i}. ${g}`).join("\n")}`,
    `Check-ins (${checkins.length}):\n${checkins.length ? checkinSummary(checkins, plan, profile.goals, sessionTextById) : "(none yet)"}`,
    `Helped session ids already computed in code: ${helped_sessions.join(", ") || "none"}`,
    `Next steps (session ids fixed in code):\n${
      nextStepPicks.length
        ? nextStepPicks
            .map(
              (pick) =>
                `- ${pick.session_id}: ${pick.title}${pick.time ? ` at ${pick.time}` : ""}${pick.room ? ` in ${pick.room}` : ""}`,
            )
            .join("\n")
        : "(none picked)"
    }`,
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
    const validated = validateClaudeReadout(
      draft,
      profile,
      plan,
      checkins,
      helped_sessions,
      asOfMs,
      sessionMetaById,
      new Set(sessionTextById.keys()),
      final,
    );
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
