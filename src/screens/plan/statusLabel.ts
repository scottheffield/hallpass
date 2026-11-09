import type { PlanItem } from "../../../shared/types";

/** Visible status text when a session is not actionable (not color-only). */
export function planSessionStatusDetail(item: Pick<PlanItem, "pinned" | "status">): string | undefined {
  if (item.pinned) return "Status: Kept on your plan";
  if (item.status === "done") return "Status: Done";
  if (item.status === "skipped") return "Status: Skipped";
  return undefined;
}
