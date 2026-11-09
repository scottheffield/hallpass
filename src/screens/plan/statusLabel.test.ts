import { describe, expect, it } from "vitest";
import { planSessionStatusDetail } from "./statusLabel";

describe("planSessionStatusDetail", () => {
  it("prefers done and skipped over pinned", () => {
    expect(planSessionStatusDetail({ pinned: true, status: "done" })).toBe("Status: Done");
    expect(planSessionStatusDetail({ pinned: true, status: "skipped" })).toBe("Status: Skipped");
  });

  it("labels done, skipped, and pinned", () => {
    expect(planSessionStatusDetail({ pinned: false, status: "done" })).toBe("Status: Done");
    expect(planSessionStatusDetail({ pinned: false, status: "left_early" })).toBe("Status: Left early");
    expect(planSessionStatusDetail({ pinned: false, status: "skipped" })).toBe("Status: Skipped");
    expect(planSessionStatusDetail({ pinned: true, status: "planned" })).toBe("Status: Kept on your plan");
  });

  it("returns undefined for planned items", () => {
    expect(planSessionStatusDetail({ pinned: false, status: "planned" })).toBeUndefined();
  });
});
