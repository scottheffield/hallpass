import { describe, expect, it } from "vitest";
import { starterGoalSelectedLabel } from "./accessibility";

describe("starterGoalSelectedLabel", () => {
  it("returns Selected when pressed", () => {
    expect(starterGoalSelectedLabel(true)).toBe("Selected");
  });

  it("returns nothing when not pressed", () => {
    expect(starterGoalSelectedLabel(false)).toBeUndefined();
  });
});
