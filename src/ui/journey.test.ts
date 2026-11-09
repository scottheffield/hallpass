import { describe, expect, it } from "vitest";
import { conferencePhase } from "./journeyPhase";

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
