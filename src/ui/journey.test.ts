import { describe, expect, it } from "vitest";
import type { Plan } from "../../shared/types";
import { attendeeJourneyPhase, conferencePhase, planHasPreparedContent } from "./journeyPhase";

describe("conference journey phase", () => {
  it.each([
    ["2026-11-10T06:59:59Z", 0],
    ["2026-11-10T07:00:00Z", 1],
    ["2026-11-12T23:59:59-07:00", 1],
    ["2026-11-13T00:00:00-07:00", 2],
  ])("uses conference-local calendar boundaries at %s", (instant, expected) => {
    expect(conferencePhase(new Date(instant))).toBe(expected);
  });
});

describe("planHasPreparedContent", () => {
  it("is false when plan is missing or empty", () => {
    expect(planHasPreparedContent(null)).toBe(false);
    expect(planHasPreparedContent({ attendee_id: "a", days: {}, source: "basic", updated_at: "2026-11-01T12:00:00-07:00" })).toBe(
      false,
    );
  });

  it("is true when any day has sessions or breaks", () => {
    const plan: Plan = {
      attendee_id: "a",
      source: "basic",
      updated_at: "2026-11-01T12:00:00-07:00",
      days: {
        "2026-11-10": {
          items: [{ session_id: "s1", status: "planned", reason: "Fit" }],
          breaks: [],
        },
      },
    };
    expect(planHasPreparedContent(plan)).toBe(true);
  });
});

describe("attendeeJourneyPhase", () => {
  const during = new Date("2026-11-10T10:00:00-07:00");
  const before = new Date("2026-11-01T10:00:00-07:00");
  const after = new Date("2026-11-14T10:00:00-07:00");

  it("keeps new attendees on stage 1 while goals or plan are missing", () => {
    expect(attendeeJourneyPhase(during, { hasProfile: false, hasPreparedPlan: false })).toBe(0);
    expect(attendeeJourneyPhase(during, { hasProfile: true, hasPreparedPlan: false })).toBe(0);
  });

  it("uses the calendar only after the attendee is prepared", () => {
    const ready = { hasProfile: true, hasPreparedPlan: true };
    expect(attendeeJourneyPhase(before, ready)).toBe(0);
    expect(attendeeJourneyPhase(during, ready)).toBe(1);
    expect(attendeeJourneyPhase(after, ready)).toBe(2);
  });
});
