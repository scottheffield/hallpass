import { describe, expect, it } from "vitest";
import type { Plan } from "../../../shared/types";
import { EVENT_DAYS } from "../../../shared/event";
import {
  dayNeedsGeneration,
  dayTabLabel,
  seedAttemptedDaysFromPlan,
  shouldAutoGeneratePlanDay,
} from "./days";

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

describe("shouldAutoGeneratePlanDay", () => {
  const idle = {
    stub: false,
    loading: false,
    generating: false,
    genError: null as string | null,
    loadError: null as string | null,
    hasProfile: true,
    plan: null as Plan | null,
    selectedDay: EVENT_DAYS[0],
    attemptedDays: new Set<string>(),
  };

  it("generates the first day when no plan exists yet", () => {
    expect(shouldAutoGeneratePlanDay(idle)).toBe(true);
  });

  it("runs at most once per selected day", () => {
    expect(
      shouldAutoGeneratePlanDay({
        ...idle,
        attemptedDays: new Set([EVENT_DAYS[0]]),
      }),
    ).toBe(false);
  });

  it("does not generate without a saved profile", () => {
    expect(
      shouldAutoGeneratePlanDay({
        ...idle,
        hasProfile: false,
      }),
    ).toBe(false);
  });

  it("does not generate after a plan load error", () => {
    expect(
      shouldAutoGeneratePlanDay({
        ...idle,
        plan: null,
        loadError: "Could not load your plan.",
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
