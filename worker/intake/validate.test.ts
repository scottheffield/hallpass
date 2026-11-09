import { describe, expect, it } from "vitest";
import { repairProfileDraft } from "./validate";

describe("repairProfileDraft", () => {
  it("keeps one to three goals and drops oversize ones", () => {
    const draft = repairProfileDraft(
      {
        why_summary: "Why",
        goals: ["a", "b", "c", "d", "x".repeat(250)],
        role: "SRE",
        problems: [],
        topics: [],
        tools: [],
        people_to_see: [],
        expertise_to_see: [],
        energy: "medium",
        pacing: "balanced",
        breaks: "",
        goal_themes: ["not-a-theme", "observability"],
      },
      "fallback purpose",
    );
    expect(draft.goals).toHaveLength(3);
    expect(draft.goals[2].length).toBeLessThanOrEqual(200);
    expect(draft.goal_themes).toEqual(["observability"]);
  });

  it("creates a goal from purpose when goals are empty", () => {
    const draft = repairProfileDraft(
      {
        why_summary: "",
        goals: [],
        role: "",
        problems: [],
        topics: [],
        tools: [],
        people_to_see: [],
        expertise_to_see: [],
        energy: "nope" as never,
        pacing: "nope" as never,
        breaks: "",
      },
      "Ship one platform improvement.",
    );
    expect(draft.goals).toEqual(["Ship one platform improvement."]);
    expect(draft.energy).toBe("medium");
    expect(draft.pacing).toBe("balanced");
    expect(draft.role).toBe("Attendee");
  });
});
