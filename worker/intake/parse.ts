import type { IntakeAnswers, ProfileDraft } from "../../shared/api";
import type { Energy, Pacing } from "../../shared/types";
import { HttpError } from "../lib/http";

const MAX_PURPOSE = 5000;
const MAX_LIST_ITEM = 300;
const MAX_LIST = 12;
const MAX_GOALS = 3;
const MAX_WHY = 500;

function textField(value: unknown, max: number, required = false): string | undefined {
  if (value === undefined || value === null) {
    if (required) throw new HttpError(400, "bad_request", "Expected text.");
    return undefined;
  }
  if (typeof value !== "string") throw new HttpError(400, "bad_request", "Expected text.");
  if (value.length > max) throw new HttpError(400, "too_large", "Text is too long.");
  return value;
}

function stringList(value: unknown, maxItems = MAX_LIST): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) throw new HttpError(400, "bad_request", "Expected a list.");
  if (value.length > maxItems) throw new HttpError(400, "too_large", "Too many items.");
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") throw new HttpError(400, "bad_request", "List items must be text.");
    if (item.length > MAX_LIST_ITEM) throw new HttpError(400, "too_large", "An item is too long.");
    const trimmed = item.trim();
    if (trimmed) out.push(trimmed);
  }
  return out.length ? out : undefined;
}

function requiredStringList(value: unknown, field: string): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new HttpError(400, "bad_request", `${field} must be a list.`);
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") throw new HttpError(400, "bad_request", `${field} items must be text.`);
    out.push(item);
  }
  return out;
}

function pacing(value: unknown): Pacing | undefined {
  if (value === undefined || value === null) return undefined;
  if (value === "packed" || value === "balanced" || value === "light") return value;
  throw new HttpError(400, "bad_request", "Pacing must be relaxed, balanced, or full.");
}

function requiredPacing(value: unknown): Pacing {
  const p = pacing(value);
  if (!p) throw new HttpError(400, "bad_request", "Pacing is required.");
  return p;
}

function energy(value: unknown): Energy | undefined {
  if (value === undefined || value === null) return undefined;
  if (value === "low" || value === "medium" || value === "high") return value;
  throw new HttpError(400, "bad_request", "Energy must be low, medium, or high.");
}

function requiredEnergy(value: unknown): Energy {
  const e = energy(value);
  if (!e) throw new HttpError(400, "bad_request", "Energy is required.");
  return e;
}

export function parseIntakeAnswers(raw: unknown): IntakeAnswers {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new HttpError(400, "bad_request", "Answers must be an object.");
  }
  const body = raw as Record<string, unknown>;
  const purpose = textField(body.purpose, MAX_PURPOSE) ?? "";
  return {
    purpose,
    figuring_it_out: body.figuring_it_out === true ? true : undefined,
    starter_goals: stringList(body.starter_goals),
    role: textField(body.role, 200),
    problems: stringList(body.problems),
    tools: stringList(body.tools),
    people_to_see: stringList(body.people_to_see),
    expertise_to_see: stringList(body.expertise_to_see),
    topics: stringList(body.topics),
    pacing: pacing(body.pacing),
    energy: energy(body.energy),
    breaks: textField(body.breaks, 300),
    access_needs: textField(body.access_needs, 500),
    clarify_answer: textField(body.clarify_answer, 500),
  };
}

/** Validate a profile POST body before repair. Malformed shapes return 400, not 500. */
export function parseProfileDraft(raw: unknown): ProfileDraft {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new HttpError(400, "bad_request", "Profile must be an object.");
  }
  const body = raw as Record<string, unknown>;
  const goalsRaw = body.goals;
  if (!Array.isArray(goalsRaw)) throw new HttpError(400, "bad_request", "Goals must be a list.");
  if (goalsRaw.length > MAX_GOALS) throw new HttpError(400, "too_large", "At most three goals.");
  const goals: string[] = [];
  for (const goal of goalsRaw) {
    if (typeof goal !== "string") throw new HttpError(400, "bad_request", "Goal items must be text.");
    if (goal.length > 200) throw new HttpError(400, "too_large", "A goal is too long.");
    goals.push(goal);
  }

  return {
    why_summary: textField(body.why_summary, MAX_WHY) ?? "",
    goals,
    goal_themes: stringList(body.goal_themes, 8),
    role: textField(body.role, 200, true) ?? "",
    problems: requiredStringList(body.problems, "Problems"),
    topics: requiredStringList(body.topics, "Topics"),
    tools: requiredStringList(body.tools, "Tools"),
    people_to_see: requiredStringList(body.people_to_see, "People to see"),
    expertise_to_see: requiredStringList(body.expertise_to_see, "Expertise to see"),
    energy: requiredEnergy(body.energy),
    pacing: requiredPacing(body.pacing),
    breaks: textField(body.breaks, 300) ?? "",
    access_needs: textField(body.access_needs, 500),
  };
}
