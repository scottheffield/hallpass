import { describe, expect, it } from "vitest";
import { dayNeedsGeneration, dayTabLabel } from "./days";

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
