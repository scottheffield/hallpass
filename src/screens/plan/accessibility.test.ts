import { describe, expect, it } from "vitest";
import { dayTabFocusIndex, planDayPanelId, planDayTabId } from "./accessibility";

describe("planDayTabId", () => {
  it("includes the day key", () => {
    expect(planDayTabId("2026-11-10")).toBe("plan-day-tab-2026-11-10");
  });
});

describe("planDayPanelId", () => {
  it("includes the day key", () => {
    expect(planDayPanelId("2026-11-10")).toBe("plan-day-panel-2026-11-10");
  });
});

describe("dayTabFocusIndex", () => {
  const count = 3;

  it("wraps on arrow keys", () => {
    expect(dayTabFocusIndex(0, "ArrowLeft", count)).toBe(2);
    expect(dayTabFocusIndex(2, "ArrowRight", count)).toBe(0);
    expect(dayTabFocusIndex(1, "ArrowRight", count)).toBe(2);
    expect(dayTabFocusIndex(1, "ArrowLeft", count)).toBe(0);
  });

  it("jumps to ends", () => {
    expect(dayTabFocusIndex(1, "Home", count)).toBe(0);
    expect(dayTabFocusIndex(0, "End", count)).toBe(2);
  });
});
