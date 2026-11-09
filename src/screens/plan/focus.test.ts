import { describe, expect, it } from "vitest";
import { planFocusLine, shortenFocus } from "./focus";

describe("shortenFocus", () => {
  it("keeps a short goal intact", () => {
    expect(shortenFocus("Diagnose incidents faster")).toBe("Diagnose incidents faster");
  });

  it("uses the first sentence when the goal has several", () => {
    expect(shortenFocus("Ship safer deploys. Learn from other teams.")).toBe("Ship safer deploys");
  });

  it("truncates very long first sentences", () => {
    const long = "A".repeat(120);
    expect(shortenFocus(`${long}. More text.`)).toHaveLength(86);
    expect(shortenFocus(`${long}. More text.`).endsWith("…")).toBe(true);
  });
});

describe("planFocusLine", () => {
  it("returns null when there are no goals", () => {
    expect(planFocusLine([])).toBeNull();
    expect(planFocusLine(["", "  "])).toBeNull();
  });

  it("uses the first non-empty goal", () => {
    expect(planFocusLine(["", "Focus on observability"])).toBe("Focus on observability");
  });
});
