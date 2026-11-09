import { describe, expect, it } from "vitest";
import { fixturePlan, fixtureProfile } from "../lib/fixtures";
import {
  alignBringBack,
  buildFallbackCase,
  buildFallbackCaseText,
  defaultBringBack,
  filterResolvableSessionIds,
  orderedPlanSessionIds,
} from "./case";

describe("orderedPlanSessionIds", () => {
  it("returns ids in day order without duplicates", () => {
    const plan = fixturePlan("a");
    const ids = orderedPlanSessionIds(plan);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids[0]).toBe("1246200");
  });
});

describe("filterResolvableSessionIds", () => {
  it("drops ids that are not on the agenda", () => {
    const resolvable = new Set(["1246200", "1250865"]);
    expect(filterResolvableSessionIds(["1246200", "ghost", "1250865"], resolvable)).toEqual(["1246200", "1250865"]);
  });
});

describe("buildFallbackCase", () => {
  it("uses profile problems and plan session ids", () => {
    const profile = fixtureProfile("demo");
    const plan = fixturePlan("demo");
    const titles = new Map(
      orderedPlanSessionIds(plan).map((id, index) => [id, `Session ${index + 1}`] as const),
    );
    const item = buildFallbackCase({ attendeeId: "demo", profile, plan, sessionTitleById: titles });
    expect(item.problems).toEqual(profile.problems);
    expect(item.sessions.length).toBeGreaterThan(0);
    expect(item.bring_back).toEqual(profile.goals);
    expect(item.text).toContain("Session 1");
    expect(item.text.toLowerCase()).toContain("ai unavailable");
  });
});

describe("alignBringBack", () => {
  const goals = ["Goal one.", "Goal two.", "Goal three.", "Goal four."];

  it("keeps rephrased lines when the goal index is valid", () => {
    expect(
      alignBringBack(
        [
          { goal: 0, text: "Bring home a faster incident triage habit." },
          { goal: 1, text: "Draft inference runbook notes." },
        ],
        goals,
      ),
    ).toEqual(["Bring home a faster incident triage habit.", "Draft inference runbook notes."]);
  });

  it("falls back to profile goals capped at three", () => {
    expect(alignBringBack([{ goal: 9, text: "orphan" }], goals)).toEqual(goals.slice(0, 3));
    expect(defaultBringBack(goals)).toEqual(goals.slice(0, 3));
  });

  it("caps model rephrases at three", () => {
    const items = goals.map((_, index) => ({ goal: index, text: `Takeaway ${index}` }));
    expect(alignBringBack(items, goals)).toHaveLength(3);
  });
});

describe("buildFallbackCaseText", () => {
  it("stays within a reasonable word range", () => {
    const profile = fixtureProfile("demo");
    const text = buildFallbackCaseText(profile, ["Talk A", "Talk B"], profile.goals);
    const words = text.split(/\s+/).filter(Boolean).length;
    expect(words).toBeGreaterThanOrEqual(40);
    expect(words).toBeLessThanOrEqual(200);
  });
});
