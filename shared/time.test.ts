import { describe, expect, it } from "vitest";
import { formatDisplayTime } from "./time";

describe("formatDisplayTime", () => {
  it("formats conference afternoon times in 12-hour style", () => {
    expect(formatDisplayTime("2026-11-10T15:40:00-07:00")).toBe("3:40 PM");
  });

  it("formats morning times with minutes", () => {
    expect(formatDisplayTime("2026-11-10T12:20:00-07:00")).toBe("12:20 PM");
  });

  it("returns empty for invalid input", () => {
    expect(formatDisplayTime("not-a-date")).toBe("");
  });
});
