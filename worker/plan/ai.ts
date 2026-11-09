import type { Pacing, PlanBreak, PlanItem, Profile } from "../../shared/types";
import type { Env } from "../env";
import { HttpError } from "../lib/http";
import { claudeJson } from "../lib/claude";
import type { PlanCandidate } from "./candidates";
import { candidateBrief } from "./candidates";
import { type RawPick, validateDayPlan } from "./validate";

interface AiPlan {
  picks: RawPick[];
  breaks: PlanBreak[];
}

const SCHEMA = {
  type: "object",
  properties: {
    picks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          session_id: { type: "string" },
          reason: { type: "string" },
          beat_alternative: {
            type: "object",
            properties: {
              session_id: { type: "string" },
              why: { type: "string" },
            },
            required: ["session_id", "why"],
            additionalProperties: false,
          },
          clash_note: { type: "string" },
        },
        required: ["session_id", "reason"],
        additionalProperties: false,
      },
    },
    breaks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          start: { type: "string" },
          end: { type: "string" },
          note: { type: "string" },
        },
        required: ["start", "end", "note"],
        additionalProperties: false,
      },
    },
  },
  required: ["picks", "breaks"],
  additionalProperties: false,
} as const;

function profileBlock(profile: Profile): string {
  return [
    `Summary: ${profile.why_summary}`,
    `Goals: ${profile.goals.join(" | ")}`,
    `Role: ${profile.role}`,
    `Pacing: ${profile.pacing}`,
    `Break preference: ${profile.breaks}`,
    `Topics: ${profile.topics.join(", ")}`,
  ].join("\n");
}

function pacingBreaks(pacing: Pacing): string {
  if (pacing === "packed") return "0 to 1 breaks";
  if (pacing === "balanced") return "about 2 breaks";
  return "3 or more breaks";
}

function normalizeAi(value: unknown): AiPlan | null {
  if (!value || typeof value !== "object") return null;
  const body = value as { picks?: unknown; breaks?: unknown };
  if (!Array.isArray(body.picks) || !Array.isArray(body.breaks)) return null;
  const picks: RawPick[] = [];
  for (const row of body.picks) {
    if (!row || typeof row !== "object") continue;
    const pick = row as RawPick;
    if (typeof pick.session_id !== "string" || typeof pick.reason !== "string") continue;
    picks.push(pick);
  }
  const breaks: PlanBreak[] = [];
  for (const row of body.breaks) {
    if (!row || typeof row !== "object") continue;
    const br = row as PlanBreak;
    if (typeof br.start !== "string" || typeof br.end !== "string" || typeof br.note !== "string") continue;
    breaks.push(br);
  }
  return { picks, breaks };
}

async function askClaude(env: Env, profile: Profile, candidates: PlanCandidate[], repair?: string[]): Promise<AiPlan | null> {
  const list = candidates.map((candidate, index) => `${index + 1}. ${candidateBrief(candidate)}`).join("\n\n");
  const repairNote = repair?.length
    ? `Fix these validation errors from the last attempt:\n- ${repair.join("\n- ")}\n`
    : "";
  const system = [
    "You build one conference day plan from candidate session ids.",
    "Each reason must name one attendee goal in plain words and cite the abstract.",
    "Say whether the match came from topic, speaker background, or a named speaker.",
    "Do not invent sessions, times, or outcomes that are not in the abstract.",
    "Use only candidate ids. Pick non-overlapping sessions.",
    `Break count should fit pacing (${pacingBreaks(profile.pacing)}).`,
    "Return JSON only.",
  ].join(" ");
  const user = `${repairNote}Profile:\n${profileBlock(profile)}\n\nCandidates:\n${list}`;
  try {
    const parsed = await claudeJson<unknown>(env, {
      system,
      user,
      schema: SCHEMA as unknown as Record<string, unknown>,
      maxTokens: 1800,
      timeoutMs: 12_000,
    });
    return normalizeAi(parsed);
  } catch (err) {
    if (err instanceof HttpError) return null;
    return null;
  }
}

export async function aiDayPlan(
  env: Env,
  profile: Profile,
  candidates: PlanCandidate[],
  sessions: Map<string, import("../../shared/types").Session>,
  pinned: PlanItem[],
): Promise<{ items: PlanItem[]; breaks: PlanBreak[]; usedAi: boolean } | null> {
  const candidateIds = new Set(candidates.map((row) => row.session.id));
  let errors: string[] = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    const proposal = await askClaude(env, profile, candidates, attempt === 1 ? errors : undefined);
    if (!proposal) return null;
    const validated = validateDayPlan(proposal.picks, proposal.breaks, {
      pacing: profile.pacing,
      candidateIds,
      sessions,
      pinned,
    });
    if (validated.items.filter((item) => !item.pinned).length >= 3) {
      return { items: validated.items, breaks: validated.breaks, usedAi: true };
    }
    errors = validated.errors;
  }
  return null;
}
