import { describe, expect, it } from "vitest";
import type { Profile } from "../../shared/types";
import { diffPlanDay } from "../checkin/diff";
import { adjustDayAfterCheckin } from "../checkin/replan";

const profile: Profile = {
  attendee_id: "demo",
  why_summary: "test",
  goals: ["agents"],
  role: "platform",
  problems: [],
  topics: [],
  tools: [],
  people_to_see: [],
  expertise_to_see: [],
  energy: "medium",
  pacing: "balanced",
  breaks: "lunch",
  updated_at: "2026-11-10T11:00:00-07:00",
};

describe("check-in replan proposal copy", () => {
  it("passes the check-in signal into diffPlanDay so drops cite attendee feedback", () => {
    const beforeDay = {
      items: [
        { session_id: "1246200", status: "done" as const, reason: "done" },
        { session_id: "1233585", status: "planned" as const, reason: "agents platform" },
        {
          session_id: "1250865",
          status: "planned" as const,
          reason: "cache-aware LLM inference",
        },
      ],
      breaks: [] as [],
    };
    const signal = {
      session_id: "1246200",
      worth_it: "mixed" as const,
      moved_goal: "no" as const,
    };
    const revised = adjustDayAfterCheckin(profile, beforeDay, "2026-11-10T12:05:00-07:00", signal);
    const changes = diffPlanDay(beforeDay, revised, { signal });
    expect(changes[0]?.text).toContain("you said the last session didn't move your goal");
  });
});
