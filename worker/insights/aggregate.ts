import { isGoalTheme } from "../../shared/event";
import type { Insights, MovedGoal } from "../../shared/types";
import type { CheckInRow, OrganizerRows, ProfileRow, ReadoutRow } from "./rows";

export const MIN_GROUP = 3;
export const TOP_SESSIONS = 10;

function movedGoalHelps(moved: MovedGoal): boolean {
  return moved === "yes" || moved === "a_little";
}

export function countMovedGoals(checkins: CheckInRow[]): {
  moved: number;
  not_moved: number;
} {
  let moved = 0;
  let not_moved = 0;
  for (const row of checkins) {
    if (movedGoalHelps(row.moved_goal)) moved += 1;
    else not_moved += 1;
  }
  return { moved, not_moved };
}

function themeCounts(themes: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const theme of themes) {
    if (!isGoalTheme(theme)) continue;
    counts.set(theme, (counts.get(theme) ?? 0) + 1);
  }
  return counts;
}

function sortedBuckets(counts: Map<string, number>): [string, number][] {
  return [...counts.entries()]
    .filter(([, count]) => count >= MIN_GROUP)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function goalThemesFromProfiles(profiles: ProfileRow[]): { goal_theme: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const profile of profiles) {
    for (const theme of profile.goal_themes) {
      if (!isGoalTheme(theme)) continue;
      counts.set(theme, (counts.get(theme) ?? 0) + 1);
    }
  }
  return sortedBuckets(counts).map(([goal_theme, count]) => ({ goal_theme, count }));
}

function gapThemesFromReadouts(readouts: ReadoutRow[]): { gap_theme: string; count: number }[] {
  const themes: string[] = [];
  for (const readout of readouts) {
    themes.push(...readout.gap_themes.filter(isGoalTheme));
  }
  return sortedBuckets(themeCounts(themes)).map(([gap_theme, count]) => ({ gap_theme, count }));
}

function sessionsMovingGoals(checkins: CheckInRow[]): Insights["sessions_moving_goals"] {
  const bySession = new Map<string, { n: number; moved: number }>();
  for (const row of checkins) {
    if (!row.session_id) continue;
    const bucket = bySession.get(row.session_id) ?? { n: 0, moved: 0 };
    bucket.n += 1;
    if (movedGoalHelps(row.moved_goal)) bucket.moved += 1;
    bySession.set(row.session_id, bucket);
  }
  return [...bySession.entries()]
    .filter(([, bucket]) => bucket.n >= MIN_GROUP)
    .map(([session_id, bucket]) => ({
      session_id,
      n: bucket.n,
      moved_goal_rate: bucket.moved / bucket.n,
    }))
    .sort((a, b) => b.moved_goal_rate - a.moved_goal_rate || b.n - a.n || a.session_id.localeCompare(b.session_id))
    .slice(0, TOP_SESSIONS);
}

function breakDemand(profiles: ProfileRow[]): number {
  let demand = 0;
  for (const profile of profiles) {
    if (profile.pacing === "light" || profile.wants_break) demand += 1;
  }
  return demand;
}

/** Build the organizer response from stripped rows. Empty input yields zeros and empty lists. */
export function buildInsights(rows: OrganizerRows): Insights {
  return {
    n_attendees: rows.profiles.length,
    top_goals: goalThemesFromProfiles(rows.profiles),
    sessions_moving_goals: sessionsMovingGoals(rows.checkins),
    gaps: gapThemesFromReadouts(rows.readouts),
    break_demand: breakDemand(rows.profiles),
  };
}
