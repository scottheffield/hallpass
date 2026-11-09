import { describe, expect, it } from "vitest";
import { todaySessionStatusDetail, TODAY_PLAN_HEADING_ID } from "./accessibility";

describe("TODAY_PLAN_HEADING_ID", () => {
  it("is a stable dom id", () => {
    expect(TODAY_PLAN_HEADING_ID).toBe("today-plan-heading");
  });
});

describe("todaySessionStatusDetail", () => {
  it("labels done and skipped with a status prefix", () => {
    expect(todaySessionStatusDetail({ status: "done" })).toBe("Status: Done");
    expect(todaySessionStatusDetail({ status: "left_early" })).toBe("Status: Left early");
    expect(todaySessionStatusDetail({ status: "skipped" })).toBe("Status: Skipped");
  });

  it("returns nothing for planned items", () => {
    expect(todaySessionStatusDetail({ status: "planned" })).toBeUndefined();
  });
});
