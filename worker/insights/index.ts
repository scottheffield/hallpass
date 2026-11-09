import type { Insights } from "../../shared/types";
import type { Env } from "../env";
import { loadAgenda } from "../lib/agenda";
import { buildInsights } from "./aggregate";
import { loadOrganizerRows } from "./fetch";
import { attachSessionTitles } from "./titles";

export interface InsightsResult {
  insights: Insights;
  stub: boolean;
}

export async function computeInsights(env: Env): Promise<InsightsResult> {
  const [agenda, { rows, stub }] = await Promise.all([loadAgenda(env), loadOrganizerRows(env)]);
  const insights = attachSessionTitles(buildInsights(rows), agenda.sessions);
  return { insights, stub };
}

export { buildInsights, countMovedGoals, MIN_GROUP } from "./aggregate";
