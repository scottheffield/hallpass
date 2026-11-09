import { describe, expect, it } from "vitest";
import type { IsoDateTime } from "../../shared/types";
import { buildDemoBarSummaryLabel } from "./DemoBar";

describe("buildDemoBarSummaryLabel", () => {
  it("formats the collapsed demo bar line", () => {
    const iso = "2026-11-10T12:05:00-07:00" as IsoDateTime;
    expect(buildDemoBarSummaryLabel(iso)).toBe("Demo · Tue 12:05 PM · Controls");
  });

  it("falls back when the timestamp is not on a conference day", () => {
    const iso = "1999-01-01T12:00:00-07:00" as IsoDateTime;
    expect(buildDemoBarSummaryLabel(iso)).toBe("Demo · Controls");
  });
});
