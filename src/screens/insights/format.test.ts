import { describe, expect, it } from "vitest";
import {
  barWidthPercent,
  formatAttendeeSample,
  formatBreakDemand,
  formatCheckInSample,
  formatMovedGoalPercent,
  goalThemeLabel,
  sessionRowLabel,
} from "./format";

describe("goalThemeLabel", () => {
  it("maps known theme ids to labels", () => {
    expect(goalThemeLabel("observability")).toBe("Observability");
    expect(goalThemeLabel("platform-engineering")).toBe("Platform engineering");
  });

  it("humanizes unknown ids", () => {
    expect(goalThemeLabel("custom-theme")).toBe("custom theme");
  });
});

describe("formatMovedGoalPercent", () => {
  it("rounds rates to whole percents", () => {
    expect(formatMovedGoalPercent(2 / 3)).toBe("67%");
    expect(formatMovedGoalPercent(0)).toBe("0%");
    expect(formatMovedGoalPercent(1)).toBe("100%");
  });
});

describe("barWidthPercent", () => {
  it("scales against the section max", () => {
    expect(barWidthPercent(3, 9)).toBe(33);
    expect(barWidthPercent(9, 9)).toBe(100);
  });

  it("handles empty max safely", () => {
    expect(barWidthPercent(0, 0)).toBe(0);
  });
});

describe("formatAttendeeSample", () => {
  it("uses plural copy for zero and many", () => {
    expect(formatAttendeeSample(0)).toMatch(/No attendee profiles/);
    expect(formatAttendeeSample(30)).toMatch(/30 attendee profiles/);
  });
});

describe("formatBreakDemand", () => {
  it("describes demand relative to population", () => {
    expect(formatBreakDemand(0, 10)).toMatch(/No profiles asked/);
    expect(formatBreakDemand(4, 10)).toBe("4 profiles asked for lighter pacing or breaks.");
  });
});

describe("sessionRowLabel", () => {
  it("prefers the agenda title", () => {
    expect(sessionRowLabel("1", "Observability in practice")).toBe("Observability in practice");
    expect(sessionRowLabel("999")).toBe("Session 999");
  });
});

describe("formatCheckInSample", () => {
  it("formats check-in counts", () => {
    expect(formatCheckInSample(3)).toBe("3 check-ins");
    expect(formatCheckInSample(1)).toBe("1 check-in");
    expect(formatCheckInSample(0)).toBe("");
  });
});
