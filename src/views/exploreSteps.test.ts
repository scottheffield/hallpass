import { describe, expect, it } from "vitest";
import { buildExplorePlan, exploreStepAt } from "./exploreSteps";

describe("exploreSteps", () => {
  it("skips stuck question when purpose is not incident-shaped", () => {
    const plan = buildExplorePlan({ purpose: "Meet platform engineers" });
    expect(plan.find((s) => s.legend.includes("stuck"))).toBeUndefined();
  });

  it("includes stuck and pacing when context is thin", () => {
    const answers = { purpose: "Kubernetes incident response practice" };
    const plan = buildExplorePlan(answers);
    expect(plan.length).toBeGreaterThan(0);
    expect(plan[0].legend).toContain("stuck");
    const withRole = { ...answers, role: "SRE", pacing: "balanced" as const };
    const trimmed = buildExplorePlan(withRole);
    expect(trimmed.some((s) => s.legend.includes("stuck"))).toBe(true);
    expect(trimmed.some((s) => s.name === "pacing")).toBe(false);
  });

  it("caps the sequence", () => {
    const plan = buildExplorePlan({ purpose: "" });
    expect(plan.length).toBeLessThanOrEqual(8);
    expect(exploreStepAt({ purpose: "" }, 99)).toBeNull();
  });
});
