import type { IntakeAnswers } from "../../shared/api";
import type { Energy, Pacing } from "../../shared/types";
import { HttpError } from "../lib/http";

const MAX_PURPOSE = 5000;
const MAX_LIST_ITEM = 300;
const MAX_LIST = 12;

function textField(value: unknown, max: number): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") throw new HttpError(400, "bad_request", "Expected text.");
  if (value.length > max) throw new HttpError(400, "too_large", "Answer is too long.");
  return value;
}

function stringList(value: unknown): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) throw new HttpError(400, "bad_request", "Expected a list.");
  if (value.length > MAX_LIST) throw new HttpError(400, "too_large", "Too many items.");
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") throw new HttpError(400, "bad_request", "List items must be text.");
    if (item.length > MAX_LIST_ITEM) throw new HttpError(400, "too_large", "An item is too long.");
    const trimmed = item.trim();
    if (trimmed) out.push(trimmed);
  }
  return out.length ? out : undefined;
}

function pacing(value: unknown): Pacing | undefined {
  if (value === undefined || value === null) return undefined;
  if (value === "packed" || value === "balanced" || value === "light") return value;
  throw new HttpError(400, "bad_request", "Pacing must be relaxed, balanced, or full.");
}

function energy(value: unknown): Energy | undefined {
  if (value === undefined || value === null) return undefined;
  if (value === "low" || value === "medium" || value === "high") return value;
  throw new HttpError(400, "bad_request", "Energy must be low, medium, or high.");
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
