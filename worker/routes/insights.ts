import type { InsightsResponse } from "../../shared/api";
import type { Env } from "../env";
import { fixtureProfile } from "../lib/fixtures";
import { json } from "../lib/http";

/**
 * Stub organizer view. Counts from the illustrative persona only.
 * The organizer slice replaces this and drops buckets smaller than 3.
 * No notes, access needs, or attendee ids.
 */
export async function insights(_request: Request, env: Env, ctx: ExecutionContext, attendeeId: string): Promise<Response> {
  void env;
  void ctx;
  const profile = fixtureProfile(attendeeId);
  const response: InsightsResponse = {
    stub: true,
    n_attendees: 1,
    top_goals: (profile.goal_themes ?? []).map((goal_theme) => ({ goal_theme, count: 1 })),
    sessions_moving_goals: [],
    gaps: [],
    break_demand: profile.breaks ? 1 : 0,
  };
  return json(response);
}
