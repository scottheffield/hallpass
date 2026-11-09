import type { IntakeAnswers } from "../../../shared/api";
import { INTAKE } from "../../../shared/event";
import type { Pacing } from "../../../shared/types";

export type ExploreStep =
  | {
      kind: "choice";
      legend: string;
      name: string;
      hint?: string;
      options: readonly { value: string; label: string; description?: string }[];
      apply: (answers: IntakeAnswers, value: string) => IntakeAnswers;
    }
  | {
      kind: "field";
      legend: string;
      name: string;
      placeholder?: string;
      apply: (answers: IntakeAnswers, value: string) => IntakeAnswers;
    };

const STUCK_OPTIONS = [
  { value: "cause", label: "Finding the cause", description: "The signal is there; the reason is not." },
  { value: "next", label: "Knowing what to try next", description: "Too many options once you're in the incident." },
  { value: "other", label: "Something else", description: "You'll say it in your own words." },
] as const;

const MAX_STEPS = 8;

function mentionsIncidents(purpose: string): boolean {
  const lower = purpose.toLowerCase();
  return lower.includes("incident") || lower.includes("kubernetes") || lower.includes("debug");
}

export function buildExplorePlan(answers: IntakeAnswers): ExploreStep[] {
  const steps: ExploreStep[] = [];
  if (mentionsIncidents(answers.purpose) && !answers.problems?.length) {
    steps.push({
      kind: "choice",
      legend: "Where do you get stuck most often?",
      name: "stuck",
      hint: "Choices are starting points, not categories.",
      options: STUCK_OPTIONS,
      apply: (current, value) => {
        const label = STUCK_OPTIONS.find((o) => o.value === value)?.label ?? value;
        const problems = [...(current.problems ?? [])];
        if (label && !problems.includes(label)) problems.push(label);
        return { ...current, problems };
      },
    });
  }
  if (!answers.role?.trim()) {
    steps.push({
      kind: "field",
      legend: INTAKE.work.role,
      name: "role",
      placeholder: "For example: SRE, platform engineer.",
      apply: (current, value) => ({ ...current, role: value }),
    });
  }
  if (!answers.pacing) {
    steps.push({
      kind: "choice",
      legend: INTAKE.pace.prompt,
      name: "pacing",
      options: INTAKE.pace.choices.map((c) => ({
        value: c.id,
        label: c.label,
        description: c.detail,
      })),
      apply: (current, value) => ({ ...current, pacing: value as Pacing }),
    });
  }
  steps.push({
    kind: "field",
    legend: INTAKE.pace.access,
    name: "access",
    placeholder: "Optional. Only what you choose to share.",
    apply: (current, value) => ({ ...current, access_needs: value || undefined }),
  });
  return steps.slice(0, MAX_STEPS);
}

export function exploreStepAt(answers: IntakeAnswers, index: number): ExploreStep | null {
  const plan = buildExplorePlan(answers);
  return plan[index] ?? null;
}
