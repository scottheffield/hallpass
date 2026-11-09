import type { ProfileDraft } from "../../shared/api";
import type { Energy, Pacing } from "../../shared/types";
import { isGoalTheme } from "../../shared/event";

const MAX_GOAL_LEN = 200;
const MAX_WHY = 500;

function isEnergy(value: unknown): value is Energy {
  return value === "low" || value === "medium" || value === "high";
}

function isPacing(value: unknown): value is Pacing {
  return value === "packed" || value === "balanced" || value === "light";
}

function trimList(items: string[] | undefined, maxItems: number, maxLen: number): string[] {
  if (!items?.length) return [];
  return items
    .map((item) => item.trim().slice(0, maxLen))
    .filter(Boolean)
    .slice(0, maxItems);
}

/**
 * Enforce profile invariants. Drops or repairs bad fields instead of failing intake.
 */
export function repairProfileDraft(draft: ProfileDraft, purposeFallback: string): ProfileDraft {
  const why = (draft.why_summary?.trim() || purposeFallback.trim() || "Attend KubeCon with a clear purpose.").slice(
    0,
    MAX_WHY,
  );

  let goals = (draft.goals ?? [])
    .map((goal) => goal.trim().slice(0, MAX_GOAL_LEN))
    .filter(Boolean)
    .slice(0, 3);
  if (!goals.length) goals = [why.slice(0, MAX_GOAL_LEN)];

  const goalThemes = (draft.goal_themes ?? []).filter((id) => isGoalTheme(id)).slice(0, 4);

  return {
    why_summary: why,
    goals,
    goal_themes: goalThemes.length ? goalThemes : undefined,
    role: (draft.role?.trim() || "Attendee").slice(0, 200),
    problems: trimList(draft.problems, 8, 300),
    topics: trimList(draft.topics, 8, 200),
    tools: trimList(draft.tools, 8, 120),
    people_to_see: trimList(draft.people_to_see, 8, 200),
    expertise_to_see: trimList(draft.expertise_to_see, 8, 200),
    energy: isEnergy(draft.energy) ? draft.energy : "medium",
    pacing: isPacing(draft.pacing) ? draft.pacing : "balanced",
    breaks: (draft.breaks?.trim() || "").slice(0, 300),
    access_needs: draft.access_needs?.trim() ? draft.access_needs.trim().slice(0, 500) : undefined,
  };
}
