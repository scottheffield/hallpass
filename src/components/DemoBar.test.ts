import { describe, expect, it } from "vitest";
import type { IsoDateTime } from "../../shared/types";
import { buildDemoBarAccessibleLabel, buildDemoBarTimeLabel } from "./DemoBar";

describe("buildDemoBarTimeLabel", () => {
  it("formats the demo clock segment for the collapsed bar", () => {
    const iso = "2026-11-10T12:05:00-07:00" as IsoDateTime;
    expect(buildDemoBarTimeLabel(iso)).toBe("Tue 12:05 PM");
  });

  it("falls back when the timestamp is not on a conference day", () => {
    const iso = "1999-01-01T12:00:00-07:00" as IsoDateTime;
    expect(buildDemoBarTimeLabel(iso)).toBe("");
  });
});

describe("buildDemoBarAccessibleLabel", () => {
  it("names presenter controls with the demo clock", () => {
    const iso = "2026-11-10T12:05:00-07:00" as IsoDateTime;
    expect(buildDemoBarAccessibleLabel(iso)).toBe("Presenter controls, demo clock Tue 12:05 PM");
  });

  it("falls back when the timestamp is not on a conference day", () => {
    const iso = "1999-01-01T12:00:00-07:00" as IsoDateTime;
    expect(buildDemoBarAccessibleLabel(iso)).toBe("Presenter controls, demo clock");
  });
});
