import type { IntakeAnswers, ProfileDraft } from "../../shared/api";
import type { Env } from "../env";
import { claudeJson } from "../lib/claude";
import { HttpError } from "../lib/http";
import { draftFromAnswers, mergeClarify, needsClarify, CLARIFY_QUESTION } from "./fallback";
import { parseIntakeAnswers, parseProfileDraft } from "./parse";
import { repairProfileDraft } from "./validate";

export interface InterviewResult {
  profile: ProfileDraft;
  clarify?: string;
  basic: boolean;
}

export function answersFromBody(body: Record<string, unknown>): IntakeAnswers {
  const raw = body.answers;
  if (raw === undefined) throw new HttpError(400, "bad_request", "Answers are required.");
  return parseIntakeAnswers(raw);
}

export function draftFromBody(body: Record<string, unknown>): ProfileDraft {
  const raw = body.profile;
  if (raw === undefined) throw new HttpError(400, "bad_request", "Profile is required.");
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new HttpError(400, "bad_request", "Profile must be an object.");
  }
  const draft = parseProfileDraft(raw);
  return repairProfileDraft(draft, draft.why_summary ?? "");
}

export async function runInterview(env: Env, answers: IntakeAnswers): Promise<InterviewResult> {
  const merged = mergeClarify(answers);
  if (needsClarify(merged)) {
    const draft = repairProfileDraft(draftFromAnswers(merged), merged.purpose);
    return { profile: draft, clarify: CLARIFY_QUESTION, basic: true };
  }

  let basic = true;
  let draft = draftFromAnswers(merged);

  if (env.ANTHROPIC_API_KEY) {
    try {
      const fromModel = await interviewWithClaude(env, merged);
      draft = fromModel;
      basic = false;
    } catch {
      draft = draftFromAnswers(merged);
      basic = true;
    }
  }

  return { profile: repairProfileDraft(draft, merged.purpose), basic };
}

/** JSON Schema for Claude structured output on interview profiles. */
export function interviewProfileJsonSchema(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      why_summary: { type: "string" },
      goals: { type: "array", items: { type: "string" } },
      role: { type: "string" },
      problems: { type: "array", items: { type: "string" } },
      topics: { type: "array", items: { type: "string" } },
      tools: { type: "array", items: { type: "string" } },
      people_to_see: { type: "array", items: { type: "string" } },
      expertise_to_see: { type: "array", items: { type: "string" } },
      energy: { type: "string", enum: ["low", "medium", "high"] },
      pacing: { type: "string", enum: ["packed", "balanced", "light"] },
      breaks: { type: "string" },
      access_needs: { type: "string" },
      goal_themes: { type: "array", items: { type: "string" } },
    },
    required: ["why_summary", "goals", "role", "problems", "topics", "tools", "people_to_see", "expertise_to_see", "energy", "pacing", "breaks"],
  };
}

async function interviewWithClaude(env: Env, answers: IntakeAnswers): Promise<ProfileDraft> {
  const system =
    "You turn conference intake answers into a short profile for session planning. Return JSON only. Use the attendee's words for goals. Do not invent disabilities or access needs.";
  const user = JSON.stringify(answers);
  const schema = interviewProfileJsonSchema();

  const parsed = await claudeJson<ProfileDraft>(env, {
    system,
    user,
    schema,
    maxTokens: 1200,
    timeoutMs: 12_000,
  });
  return parsed;
}
