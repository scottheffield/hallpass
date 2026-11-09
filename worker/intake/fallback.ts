import type { IntakeAnswers, ProfileDraft } from "../../shared/api";
import { INTAKE } from "../../shared/event";
import { inferGoalThemes } from "./themes";

function firstSentence(text: string): string {
  const trimmed = text.trim();
  const end = trimmed.search(/[.!?]\s/);
  if (end > 0 && end < 220) return trimmed.slice(0, end + 1).trim();
  return trimmed.slice(0, MAX_SNIPPET);
}

const MAX_SNIPPET = 200;

function extractRole(purpose: string, explicit?: string): string {
  if (explicit?.trim()) return explicit.trim().slice(0, 200);
  const lower = purpose.toLowerCase();
  const hits = ["sre", "platform engineer", "developer", "devops", "architect", "manager"];
  for (const hit of hits) {
    if (lower.includes(hit)) return hit === "sre" ? "SRE" : hit.replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return "";
}

function collectGoals(answers: IntakeAnswers): string[] {
  const fromStarters = answers.starter_goals?.map((g) => g.trim()).filter(Boolean) ?? [];
  if (fromStarters.length) return fromStarters.slice(0, 3);

  const purpose = answers.purpose.trim();
  if (!purpose) return [];

  if (purpose.length > 80) {
    return [firstSentence(purpose).slice(0, MAX_SNIPPET)];
  }
  return [purpose.slice(0, MAX_SNIPPET)];
}

function problemsFromStuck(answers: IntakeAnswers): string[] {
  const existing = answers.problems ?? [];
  if (existing.length) return existing;
  const purpose = answers.purpose.toLowerCase();
  if (purpose.includes("incident") || purpose.includes("debug") || purpose.includes("troubleshoot")) {
    return ["Production issues take too long to narrow down."];
  }
  return [];
}

/** Deterministic draft when Claude is off or fails. */
export function draftFromAnswers(answers: IntakeAnswers): ProfileDraft {
  const purpose = answers.purpose.trim();
  const goals = collectGoals(answers);
  const role = extractRole(purpose, answers.role);
  const topics: string[] = [];
  const tools = answers.tools ?? [];
  if (answers.topics?.length) topics.push(...answers.topics);

  const themes = inferGoalThemes(purpose, ...goals, ...(answers.topics ?? []), ...(answers.tools ?? []));

  const breaks =
    answers.breaks?.trim() ||
    (answers.pacing === "light" ? "Longer gaps between sessions." : answers.pacing === "packed" ? "" : "");

  return {
    why_summary: purpose || goals.join(" ") || "Make this conference worth the trip.",
    goals: goals.length ? goals : ["Define what to take home from KubeCon."],
    goal_themes: themes.length ? themes : undefined,
    role: role || "Attendee",
    problems: problemsFromStuck(answers),
    topics,
    tools,
    people_to_see: answers.people_to_see ?? [],
    expertise_to_see: answers.expertise_to_see ?? [],
    energy: answers.energy ?? "medium",
    pacing: answers.pacing ?? "balanced",
    breaks,
    access_needs: answers.access_needs,
  };
}

export const CLARIFY_QUESTION =
  "What would you want to tell a colleague you got from this trip? One sentence is enough.";

export function needsClarify(answers: IntakeAnswers): boolean {
  if (answers.clarify_answer?.trim()) return false;
  const purpose = answers.purpose.trim();
  const hasGoals = Boolean(answers.starter_goals?.length);
  if (hasGoals) return false;
  if (answers.figuring_it_out && purpose.length < 40) return true;
  if (purpose.length > 0 && purpose.length < 18) return true;
  return purpose.length === 0;
}

export function mergeClarify(answers: IntakeAnswers): IntakeAnswers {
  const extra = answers.clarify_answer?.trim();
  if (!extra) return answers;
  const purpose = answers.purpose.trim();
  const combined = purpose ? `${purpose}\n${extra}` : extra;
  return { ...answers, purpose: combined, clarify_answer: extra };
}

export function pacingLabel(pacing: ProfileDraft["pacing"]): string {
  const row = INTAKE.pace.choices.find((c) => c.id === pacing);
  return row?.label ?? "Balanced";
}
