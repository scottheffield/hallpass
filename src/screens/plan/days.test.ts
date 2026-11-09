import { describe, expect, it } from "vitest";
import type { Plan } from "../../../shared/types";
import { dayNeedsGeneration, dayTabLabel, seedAttemptedDaysFromPlan } from "./days";

describe("dayTabLabel", () => {
  it("formats conference days in Mountain Time", () => {
    expect(dayTabLabel("2026-11-10")).toBe("Tue");
    expect(dayTabLabel("2026-11-12")).toBe("Thu");
  });
});

describe("dayNeedsGeneration", () => {
  it("treats missing days as needing generation", () => {
    expect(dayNeedsGeneration(undefined)).toBe(true);
  });

  it("detects empty days", () => {
    expect(dayNeedsGeneration({ items: [], breaks: [] })).toBe(true);
    expect(
      dayNeedsGeneration({
        items: [{ session_id: "1", status: "planned", reason: "x" }],
        breaks: [],
      }),
    ).toBe(false);
  });

  it("does not generate when only breaks exist", () => {
    expect(
      dayNeedsGeneration({
        items: [],
        breaks: [
          {
            start: "2026-11-10T12:00:00-07:00",
            end: "2026-11-10T13:00:00-07:00",
            note: "Lunch",
          },
        ],
      }),
    ).toBe(false);
  });
});

describe("seedAttemptedDaysFromPlan", () => {
  const plan: Plan = {
    attendee_id: "a",
    source: "ai",
    updated_at: "2026-11-09T12:00:00-07:00",
    days: {
      "2026-11-10": {
        items: [{ session_id: "1", status: "planned", reason: "x" }],
        breaks: [],
      },
      "2026-11-11": { items: [], breaks: [] },
    },
  };

  it("marks days that already have sessions or breaks", () => {
    const attempted = seedAttemptedDaysFromPlan(plan);
    expect(attempted.has("2026-11-10")).toBe(true);
    expect(attempted.has("2026-11-11")).toBe(false);
    expect(attempted.has("2026-11-12")).toBe(false);
  });
});
