import type { CaseForAttending, Plan, Profile } from "../../shared/types";
import type { Env } from "../env";
import { getSession } from "../lib/agenda";
import { claudeJson } from "../lib/claude";
import { HttpError } from "../lib/http";

const FALLBACK_LABEL = "Draft built from your profile and plan (AI unavailable).";

/** Session ids from the plan in day order, deduped. */
export function orderedPlanSessionIds(plan: Plan): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const day of Object.keys(plan.days).sort()) {
    const block = plan.days[day];
    if (!block) continue;
    for (const item of block.items) {
      if (seen.has(item.session_id)) continue;
      seen.add(item.session_id);
      out.push(item.session_id);
    }
  }
  return out;
}

export function filterResolvableSessionIds(ids: readonly string[], resolvable: ReadonlySet<string>): string[] {
  return ids.filter((id) => resolvable.has(id));
}

function alignBringBack(candidates: string[], goals: readonly string[]): string[] {
  const set = new Set(goals);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const line of candidates) {
    const trimmed = line.trim();
    if (!trimmed || !set.has(trimmed) || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  if (out.length === 0) return [...goals];
  return out.slice(0, 3);
}

function trimText(value: unknown, maxLen: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLen);
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/** Plain-language case copy when the model is unavailable. About 150 words. */
export function buildFallbackCaseText(
  profile: Profile,
  sessionTitles: readonly string[],
  bringBack: readonly string[],
  label = FALLBACK_LABEL,
): string {
  const role = profile.role.trim() || "I";
  const summary = profile.why_summary.replace(/\.$/, "");
  const problemLines = profile.problems.map((p) => p.replace(/\.$/, "")).join(" ");
  const sessionList = sessionTitles.length > 0 ? sessionTitles.join("; ") : "sessions still being finalized on the plan";
  const intentions = bringBack.map((g) => g.replace(/\.$/, "")).join("; ");
  const parts = [
    `${role} is attending to ${summary}.`,
    `On the team, ${problemLines}`,
    `The conference plan includes ${sessionList}. These picks tie back to the goals above rather than a generic tour of the track hall.`,
    `I intend to bring back (planned, not guaranteed): ${intentions}.`,
    label,
  ];
  let text = parts.join(" ");
  if (wordCount(text) > 175) {
    text = [
      `${role} is attending to ${summary}.`,
      `Problems: ${problemLines}`,
      `Plan sessions: ${sessionList}.`,
      `Intended takeaways: ${intentions}.`,
      label,
    ].join(" ");
  }
  return text.slice(0, 1200);
}

export interface CaseBuildInput {
  attendeeId: string;
  profile: Profile;
  plan: Plan;
  sessionTitleById: ReadonlyMap<string, string>;
}

export function buildFallbackCase(input: CaseBuildInput): CaseForAttending {
  const { attendeeId, profile, plan, sessionTitleById } = input;
  const resolvable = new Set(sessionTitleById.keys());
  const sessions = filterResolvableSessionIds(orderedPlanSessionIds(plan), resolvable);
  const titles = sessions
    .map((id) => sessionTitleById.get(id))
    .filter((t): t is string => Boolean(t));
  const bring_back = alignBringBack(profile.goals, profile.goals);
  const text = buildFallbackCaseText(profile, titles, bring_back);
  return {
    attendee_id: attendeeId,
    problems: [...profile.problems],
    sessions,
    bring_back,
    text,
  };
}

interface ClaudeCaseDraft {
  bring_back?: string[];
  text?: string;
}

const CASE_SCHEMA = {
  type: "object",
  properties: {
    bring_back: { type: "array", items: { type: "string" } },
    text: { type: "string" },
  },
  required: ["bring_back", "text"],
  additionalProperties: false,
} as const;

function validateClaudeCase(
  draft: ClaudeCaseDraft,
  profile: Profile,
  sessions: string[],
  sessionTitleById: ReadonlyMap<string, string>,
): Pick<CaseForAttending, "bring_back" | "text"> | null {
  const bring_back = alignBringBack(
    Array.isArray(draft.bring_back) ? draft.bring_back.map((line) => trimText(line, 400)) : [],
    profile.goals,
  );
  let text = trimText(draft.text, 1200);
  if (!text || wordCount(text) < 40) return null;

  for (const id of sessions) {
    const title = sessionTitleById.get(id);
    if (!title) continue;
    if (!text.toLowerCase().includes(title.toLowerCase().slice(0, Math.min(12, title.length)))) {
      return null;
    }
  }
  return { bring_back, text };
}

async function sessionTitleMap(env: Env, plan: Plan): Promise<Map<string, string>> {
  const ids = orderedPlanSessionIds(plan);
  const map = new Map<string, string>();
  for (const id of ids) {
    const session = await getSession(env, id);
    if (!session) continue;
    map.set(id, session.title);
  }
  return map;
}

export interface GeneratedCase {
  case: CaseForAttending;
  /** True when the deterministic fallback was used instead of Claude. */
  stub: boolean;
}

export async function generateCase(env: Env, attendeeId: string, profile: Profile, plan: Plan): Promise<GeneratedCase> {
  const sessionTitleById = await sessionTitleMap(env, plan);
  const base: CaseBuildInput = { attendeeId, profile, plan, sessionTitleById };
  const fallback = buildFallbackCase(base);
  const sessionLines = fallback.sessions
    .map((id) => {
      const title = sessionTitleById.get(id);
      return title ? `- ${id}: ${title}` : null;
    })
    .filter((line): line is string => Boolean(line));

  if (!env.ANTHROPIC_API_KEY) {
    return { case: fallback, stub: true };
  }

  const system = [
    "You write a plain case for attending a conference, for the attendee to share with their manager.",
    "Use only the problems, goals, and session list provided. Do not invent sessions or outcomes.",
    "bring_back must rephrase the attendee goals as intended takeaways, not achievements.",
    "text is one copyable paragraph, about 150 words, plain language, no hype.",
    "Reply with the JSON schema only.",
  ].join(" ");

  const user = [
    `Role: ${profile.role}`,
    `Why attending: ${profile.why_summary}`,
    `Problems:\n${profile.problems.map((p) => `- ${p}`).join("\n")}`,
    `Goals (for bring_back):\n${profile.goals.map((g) => `- ${g}`).join("\n")}`,
    `Session ids and titles from the plan (must appear in text):\n${sessionLines.join("\n")}`,
  ].join("\n\n");

  try {
    const draft = await claudeJson<ClaudeCaseDraft>(env, {
      system,
      user,
      schema: CASE_SCHEMA,
      maxTokens: 700,
      timeoutMs: 12_000,
    });
    const validated = validateClaudeCase(draft, profile, fallback.sessions, sessionTitleById);
    if (!validated) return { case: fallback, stub: true };
    return {
      case: {
        attendee_id: attendeeId,
        problems: fallback.problems,
        sessions: fallback.sessions,
        bring_back: validated.bring_back,
        text: validated.text,
      },
      stub: false,
    };
  } catch (err) {
    if (!(err instanceof HttpError)) {
      console.error("case_generate", { name: err instanceof Error ? err.name : "unknown" });
    }
    return { case: fallback, stub: true };
  }
}
