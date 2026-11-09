import { describe, expect, it } from "vitest";
import { goalForPlanReason } from "./goal";

describe("goalForPlanReason", () => {
  const goals = [
    "Find practical ways to run AI inference on the platform I already operate.",
    "Get better at Kubernetes incident response when the hard part is missing context, not more dashboards.",
  ];

  it("reads quoted goals from template reasons", () => {
    const reason = 'Matches your goal "incidents" from the abstract on failure signals.';
    expect(goalForPlanReason(reason, goals)).toBe("incidents");
  });

  it("scores demo plan reasons against profile goals", () => {
    const incidentReason =
      "SREs describe AI incident response stalling on missing context: a recent deploy, an owner change, an upstream dependency.";
    expect(goalForPlanReason(incidentReason, goals)).toContain("incident");
  });
});
