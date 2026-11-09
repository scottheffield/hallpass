import { describe, expect, it } from "vitest";
import { presentPlanReason } from "./reason";

describe("presentPlanReason", () => {
  it("leaves plain reasons unchanged", () => {
    expect(presentPlanReason("Room on Level 1 for your incident goal.")).toEqual({
      reason: "Room on Level 1 for your incident goal.",
    });
  });

  it("splits topic match lines", () => {
    expect(
      presentPlanReason("Topic match: Goal on inference — the abstract describes cache cliffs."),
    ).toEqual({
      reasonLabel: "Topic match:",
      reason: "Goal on inference — the abstract describes cache cliffs.",
    });
  });

  it("relables speaker background when the body cites the abstract", () => {
    expect(
      presentPlanReason(
        "Speaker background match: Platform goal — from the abstract on SLO promises to developers.",
      ),
    ).toEqual({
      reasonLabel: "Topic match:",
      reason: "Platform goal — from the abstract on SLO promises to developers.",
    });
  });

  it("keeps speaker background when the copy is about the person", () => {
    expect(
      presentPlanReason(
        "Speaker background match: You wanted SRE voices; this speaker leads observability at a large shop.",
      ),
    ).toEqual({
      reasonLabel: "Speaker background match:",
      reason: "You wanted SRE voices; this speaker leads observability at a large shop.",
    });
  });

  it("splits named speaker match", () => {
    expect(presentPlanReason("Named speaker match: You asked to see Pat.")).toEqual({
      reasonLabel: "Named speaker match:",
      reason: "You asked to see Pat.",
    });
  });
});
