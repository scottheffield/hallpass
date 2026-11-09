import { EVENT_DAYS, EVENT_TIME_ZONE } from "../../../shared/event";
import type { Plan, PlanBreak, PlanItem } from "../../../shared/types";

export function dayTabLabel(dayKey: string): string {
  const noon = Date.parse(`${dayKey}T12:00:00-07:00`);
  if (!Number.isFinite(noon)) return dayKey;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: EVENT_TIME_ZONE,
  }).format(new Date(noon));
}

export function dayNeedsGeneration(
  day: { items: PlanItem[]; breaks: PlanBreak[] } | undefined,
): boolean {
  if (!day) return true;
  return day.items.length === 0 && day.breaks.length === 0;
}

export function shouldAutoGeneratePlanDay(input: {
  stub: boolean;
  loading: boolean;
  generating: boolean;
  genError: string | null;
  loadError: string | null;
  hasProfile: boolean;
  plan: Plan | null;
  selectedDay: string;
  attemptedDays: Set<string>;
}): boolean {
  if (input.stub || input.loading || input.generating || input.genError || input.loadError) return false;
  if (!input.plan && !input.hasProfile) return false;
  if (input.attemptedDays.has(input.selectedDay)) return false;
  return dayNeedsGeneration(input.plan?.days[input.selectedDay]);
}

/** Days that already have content should not be auto-generated after edits clear them. */
export function seedAttemptedDaysFromPlan(plan: Plan): Set<string> {
  const attempted = new Set<string>();
  for (const day of EVENT_DAYS) {
    if (!dayNeedsGeneration(plan.days[day])) attempted.add(day);
  }
  return attempted;
}
