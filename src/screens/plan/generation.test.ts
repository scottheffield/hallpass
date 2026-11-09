import { describe, expect, it } from "vitest";
import { generationStageIndex, PLAN_GENERATION_STAGES } from "./generation";

describe("generationStageIndex", () => {
  it("starts at the first stage", () => {
    expect(generationStageIndex(0)).toBe(0);
    expect(PLAN_GENERATION_STAGES[generationStageIndex(0)]).toBe("Finding relevant sessions");
  });

  it("advances every three seconds", () => {
    expect(generationStageIndex(2999)).toBe(0);
    expect(generationStageIndex(3000)).toBe(1);
    expect(generationStageIndex(9000)).toBe(PLAN_GENERATION_STAGES.length - 1);
  });
});
