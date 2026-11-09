import { describe, expect, it } from "vitest";
import {
  isSelectedDayPlanReady,
  planDayReadyCopy,
  selectedDayPlanReadyTitle,
} from "./nextStep";

describe("isSelectedDayPlanReady", () => {
  it("is false while generating or errored", () => {
    expect(
      isSelectedDayPlanReady({ generating: true, genError: null, timelineLength: 3 }),
    ).toBe(false);
    expect(
      isSelectedDayPlanReady({ generating: false, genError: "nope", timelineLength: 3 }),
    ).toBe(false);
  });

  it("is false when the timeline is empty", () => {
    expect(
      isSelectedDayPlanReady({ generating: false, genError: null, timelineLength: 0 }),
    ).toBe(false);
  });

  it("is true when the day has items and is not generating", () => {
    expect(
      isSelectedDayPlanReady({ generating: false, genError: null, timelineLength: 2 }),
    ).toBe(true);
  });
});

describe("selectedDayPlanReadyTitle", () => {
  it("uses the short weekday label", () => {
    expect(selectedDayPlanReadyTitle("2026-11-10")).toBe("Tue's plan is ready");
  });
});

describe("planDayReadyCopy", () => {
  it("offers Open Today when the selected day is conference today", () => {
    const copy = planDayReadyCopy("2026-11-10", "2026-11-10");
    expect(copy.offerOpenToday).toBe(true);
    expect(copy.futureTodayLine).toBeNull();
    expect(copy.reviewLines.length).toBeGreaterThan(0);
  });

  it("points to Today on the tab bar for a future selected day", () => {
    const copy = planDayReadyCopy("2026-11-11", "2026-11-10");
    expect(copy.offerOpenToday).toBe(false);
    expect(copy.futureTodayLine).toMatch(/Wed, Nov 11/);
    expect(copy.futureTodayLine).toMatch(/open Today/i);
  });
});
