import { describe, expect, it } from "vitest";
import { planSessionStatusDetail } from "./statusLabel";

describe("planSessionStatusDetail", () => {
  it("prefers pinned over status", () => {
    expect(planSessionStatusDetail({ pinned: true, status: "done" })).toBe("Status: Kept on your plan");
  });

  it("labels done and skipped", () => {
    expect(planSessionStatusDetail({ pinned: false, status: "done" })).toBe("Status: Done");
    expect(planSessionStatusDetail({ pinned: false, status: "skipped" })).toBe("Status: Skipped");
  });

  it("returns undefined for planned items", () => {
    expect(planSessionStatusDetail({ pinned: false, status: "planned" })).toBeUndefined();
  });
});
