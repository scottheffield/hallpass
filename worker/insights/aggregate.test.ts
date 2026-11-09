import { describe, expect, it } from "vitest";
import { buildInsights, countMovedGoals, MIN_GROUP } from "./aggregate";
import type { CheckInRow, OrganizerRows } from "./rows";

describe("buildInsights", () => {
  it("returns zeros and empty lists for empty rows", () => {
    const empty: OrganizerRows = { profiles: [], plans: 0, checkins: [], readouts: [] };
    expect(buildInsights(empty)).toEqual({
      n_attendees: 0,
      top_goals: [],
      sessions_moving_goals: [],
      gaps: [],
      break_demand: 0,
    });
  });

  it("suppresses goal and gap themes below the minimum group size", () => {
    const rows: OrganizerRows = {
      profiles: [
        { goal_themes: ["observability"], pacing: "balanced", wants_break: false },
        { goal_themes: ["observability"], pacing: "balanced", wants_break: false },
        { goal_themes: ["observability"], pacing: "balanced", wants_break: false },
        { goal_themes: ["security"], pacing: "light", wants_break: true },
      ],
      plans: 3,
      checkins: [],
      readouts: [
        { gap_themes: ["delivery"] },
        { gap_themes: ["delivery"] },
        { gap_themes: ["community"] },
        { gap_themes: ["community"] },
        { gap_themes: ["community"] },
      ],
    };
    const result = buildInsights(rows);
    expect(result.top_goals).toEqual([{ goal_theme: "observability", count: 3 }]);
    expect(result.top_goals.find((row) => row.goal_theme === "security")).toBeUndefined();
    expect(result.gaps).toEqual([{ gap_theme: "community", count: 3 }]);
    expect(result.break_demand).toBe(1);
  });

  it("computes moved-goal rate per session with a minimum check-in count", () => {
    const sessionA = "1246200";
    const sessionB = "1233585";
    const checkins: CheckInRow[] = [
      { session_id: sessionA, moved_goal: "yes" },
      { session_id: sessionA, moved_goal: "a_little" },
      { session_id: sessionA, moved_goal: "no" },
      { session_id: sessionB, moved_goal: "no" },
      { session_id: sessionB, moved_goal: "no" },
    ];
    expect(countMovedGoals(checkins)).toEqual({ moved: 2, not_moved: 3 });

    const rows: OrganizerRows = {
      profiles: Array.from({ length: MIN_GROUP }, () => ({
        goal_themes: ["observability"],
        pacing: "balanced",
        wants_break: false,
      })),
      plans: MIN_GROUP,
      checkins,
      readouts: [],
    };
    const result = buildInsights(rows);
    expect(result.sessions_moving_goals).toEqual([
      { session_id: sessionA, moved_goal_rate: 2 / 3, n: 3 },
    ]);
    expect(result.n_attendees).toBe(MIN_GROUP);
  });

  it("never includes free-text fields in the insights shape", () => {
    const result = buildInsights({
      profiles: [
        { goal_themes: ["platform-engineering"], pacing: "packed", wants_break: false },
        { goal_themes: ["platform-engineering"], pacing: "packed", wants_break: false },
        { goal_themes: ["platform-engineering"], pacing: "packed", wants_break: false },
      ],
      plans: 3,
      checkins: [
        { session_id: "999", moved_goal: "yes" },
        { session_id: "999", moved_goal: "yes" },
        { session_id: "999", moved_goal: "no" },
      ],
      readouts: [],
    });
    const keys = JSON.stringify(result);
    expect(keys).not.toMatch(/attendee_id|"note"|"title"|why_summary/);
    expect(keys).not.toContain('"goals":');
    expect(result.top_goals[0]?.goal_theme).toBe("platform-engineering");
  });
});
