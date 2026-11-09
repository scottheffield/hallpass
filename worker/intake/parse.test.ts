import { describe, expect, it } from "vitest";
import { HttpError } from "../lib/http";
import { parseProfileDraft } from "./parse";
import { repairProfileDraft } from "./validate";

const baseProfile = {
  why_summary: "Why",
  goals: ["ok"],
  role: "SRE",
  problems: [] as string[],
  topics: [] as string[],
  tools: [] as string[],
  people_to_see: [] as string[],
  expertise_to_see: [] as string[],
  energy: "medium" as const,
  pacing: "balanced" as const,
  breaks: "",
};

describe("parseProfileDraft", () => {
  it("rejects non-string list items with 400", () => {
    expect(() =>
      parseProfileDraft({
        ...baseProfile,
        problems: [1] as unknown as string[],
      }),
    ).toThrow(HttpError);
  });

  it("rejects non-string goals", () => {
    expect.assertions(2);
    try {
      parseProfileDraft({
        ...baseProfile,
        goals: [42] as unknown as string[],
      });
      expect.unreachable("parseProfileDraft should throw");
    } catch (err) {
      expect(err).toBeInstanceOf(HttpError);
      expect((err as HttpError).status).toBe(400);
    }
  });

  it("accepts long goals and summaries for repair to trim", () => {
    const long = "x".repeat(400);
    const parsed = parseProfileDraft({
      ...baseProfile,
      why_summary: long,
      goals: [long, "second"],
    });
    const repaired = repairProfileDraft(parsed, "");
    expect(repaired.why_summary.length).toBeLessThanOrEqual(500);
    expect(repaired.goals[0].length).toBeLessThanOrEqual(200);
    expect(repaired.goals).toHaveLength(2);
  });
});
