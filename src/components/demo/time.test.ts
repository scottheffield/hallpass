import { describe, expect, it } from "vitest";
import { EVENT_DAYS, EVENT_OFFSET } from "../../../shared/event";
import type { IsoDateTime } from "../../../shared/types";
import {
  buildDemoIso,
  formatDayShort,
  formatDemoWallTime,
  parseDemoWallTime,
  splitDemoIso,
} from "./time";

describe("demo time helpers", () => {
  it("builds conference-offset timestamps for each event day", () => {
    for (const day of EVENT_DAYS) {
      expect(buildDemoIso(day, 9, 15)).toBe(`${day}T09:15:00${EVENT_OFFSET}`);
    }
  });

  it("round-trips wall clock parts from a demo timestamp", () => {
    const iso = "2026-11-11T14:30:00-07:00" as IsoDateTime;
    expect(splitDemoIso(iso)).toEqual({ day: "2026-11-11", hour: 14, minute: 30 });
    const rebuilt = buildDemoIso("2026-11-11", 14, 30);
    expect(splitDemoIso(rebuilt)).toEqual({ day: "2026-11-11", hour: 14, minute: 30 });
  });

  it("rejects invalid wall times", () => {
    expect(parseDemoWallTime("24:00")).toBeNull();
    expect(parseDemoWallTime("nine")).toBeNull();
    expect(() => formatDemoWallTime(12, 60)).toThrow();
  });

  it("labels days in the conference time zone", () => {
    expect(formatDayShort("2026-11-10")).toBe("Tue");
    expect(formatDayShort("2026-11-12")).toBe("Thu");
  });
});
