import type { PlanItem } from "../../../shared/types";

/** Stable id for the visible "Today's plan" section heading. */
export const TODAY_PLAN_HEADING_ID = "today-plan-heading";

/** Visible status text when a session is not actionable (not color-only). */
export function todaySessionStatusDetail(
  item: Pick<PlanItem, "status">,
): string | undefined {
  if (item.status === "done") return "Status: Done";
  if (item.status === "skipped") return "Status: Skipped";
  return undefined;
}
