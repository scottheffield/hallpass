import { describe, expect, it } from "vitest";
import { fixturePlan, fixtureProfile } from "../lib/fixtures";
import {
  buildFallbackCase,
  buildFallbackCaseText,
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

describe("buildFallbackCaseText", () => {
  it("stays within a reasonable word range", () => {
    const profile = fixtureProfile("demo");
    const text = buildFallbackCaseText(profile, ["Talk A", "Talk B"], profile.goals);
    const words = text.split(/\s+/).filter(Boolean).length;
    expect(words).toBeGreaterThanOrEqual(40);
    expect(words).toBeLessThanOrEqual(200);
  });
});
