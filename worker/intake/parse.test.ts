import { describe, expect, it } from "vitest";
import { HttpError } from "../lib/http";
import { parseProfileDraft } from "./parse";

describe("parseProfileDraft", () => {
  it("rejects non-string list items with 400", () => {
    expect(() =>
      parseProfileDraft({
        why_summary: "Why",
        goals: ["ok"],
        role: "SRE",
        problems: [1],
        topics: [],
        tools: [],
        people_to_see: [],
        expertise_to_see: [],
        energy: "medium",
        pacing: "balanced",
        breaks: "",
      }),
    ).toThrowError(HttpError);
    try {
      parseProfileDraft({
        why_summary: "Why",
        goals: ["ok"],
        role: "SRE",
        problems: [1],
        topics: [],
        tools: [],
        people_to_see: [],
        expertise_to_see: [],
        energy: "medium",
        pacing: "balanced",
        breaks: "",
      });
    } catch (err) {
      expect(err).toBeInstanceOf(HttpError);
      expect((err as HttpError).status).toBe(400);
    }
  });

  it("rejects non-string goals", () => {
    try {
      parseProfileDraft({
        why_summary: "Why",
        goals: [42],
        role: "SRE",
        problems: [],
        topics: [],
        tools: [],
        people_to_see: [],
        expertise_to_see: [],
        energy: "medium",
        pacing: "balanced",
        breaks: "",
      });
    } catch (err) {
      expect(err).toBeInstanceOf(HttpError);
      expect((err as HttpError).status).toBe(400);
    }
  });
});
