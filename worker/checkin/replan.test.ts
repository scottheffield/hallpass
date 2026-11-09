import { describe, expect, it } from "vitest";
import type { Profile } from "../../shared/types";
import { adjustDayAfterCheckin } from "./replan";
import type { PlanDay } from "./diff";

const profile: Profile = {
  attendee_id: "test-attendee",
  why_summary: "test",
  goals: ["learn k8s"],
  role: "platform",
  problems: [],
  topics: [],
  tools: [],
  people_to_see: [],
  expertise_to_see: [],
  energy: "medium",
  pacing: "balanced",
  breaks: "lunch",
  updated_at: "2026-11-10T09:00:00-07:00",
};

const day: PlanDay = {
  items: [
    { session_id: "first", status: "planned", reason: "first" },
    { session_id: "second", status: "planned", reason: "second" },
  ],
  breaks: [],
};

describe("adjustDayAfterCheckin", () => {
  it("does not drop a planned item when the checked-in session is not on the day", () => {
    const next = adjustDayAfterCheckin(profile, day, "2026-11-10T11:00:00-07:00", {
      session_id: "off-plan-session",
      worth_it: "no",
      moved_goal: "no",
    });
    expect(next.items).toEqual(day.items);
  });
});
