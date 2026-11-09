import { describe, expect, it } from "vitest";
import type { Insights } from "../../shared/types";
import { attachSessionTitles } from "./titles";

describe("attachSessionTitles", () => {
  it("adds session_title when the session exists on the agenda", () => {
    const insights: Insights = {
      n_attendees: 3,
      top_goals: [],
      sessions_moving_goals: [
        { session_id: "1246200", moved_goal_rate: 0.67, n: 3 },
        { session_id: "missing-id", moved_goal_rate: 1, n: 3 },
      ],
      gaps: [],
      break_demand: 0,
    };
    const result = attachSessionTitles(insights, [
      {
        id: "1246200",
        title: "Ask Your Platform",
        start: "2026-11-10T11:30:00-07:00",
        end: "2026-11-10T12:00:00-07:00",
        room: "Grand Ballroom H",
        track: "AI",
        speakers: [],
        abstract: "Sample abstract for test.",
        search_text: "Ask Your Platform",
        speaker_text: "Speakers",
      },
    ]);
    expect(result.sessions_moving_goals[0]).toEqual({
      session_id: "1246200",
      moved_goal_rate: 0.67,
      n: 3,
      session_title: "Ask Your Platform",
    });
    expect(result.sessions_moving_goals[1]).toEqual({
      session_id: "missing-id",
      moved_goal_rate: 1,
      n: 3,
    });
  });
});
