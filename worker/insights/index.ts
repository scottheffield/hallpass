import type { Insights } from "../../shared/types";
import type { Env } from "../env";
import { buildInsights } from "./aggregate";
import { loadOrganizerRows } from "./fetch";

export interface InsightsResult {
  insights: Insights;
  stub: boolean;
}

export async function computeInsights(env: Env): Promise<InsightsResult> {
  const { rows, stub } = await loadOrganizerRows(env);
  return { insights: buildInsights(rows), stub };
}

export { buildInsights, countMovedGoals, MIN_GROUP } from "./aggregate";
