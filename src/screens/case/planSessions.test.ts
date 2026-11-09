import { describe, expect, it } from "vitest";
import demoPlan from "../../../shared/fixtures/demo-plan.json";
import type { Plan } from "../../../shared/types";
import { planReasonBySessionId, reasonForCaseSession } from "./planSessions";

describe("planReasonBySessionId", () => {
  it("maps session ids to saved plan reasons", () => {
    const reasons = planReasonBySessionId(demoPlan as Plan);
    expect(reasons.get("1246200")).toContain("Grand Ballroom H");
    expect(reasonForCaseSession("1246200", reasons)).toBe(reasons.get("1246200"));
    expect(reasonForCaseSession("missing", reasons)).toBeUndefined();
  });
});
