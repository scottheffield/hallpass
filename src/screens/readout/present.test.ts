import { describe, expect, it } from "vitest";
import type { Readout } from "../../../shared/types";
import {
  contentGaps,
  hasCheckInEvidence,
  parseNotEnoughGoal,
  readoutHeading,
  suggestionFollowups,
  teamRecapDraft,
  unclearGoals,
} from "./present";

const base: Readout = {
  attendee_id: "a",
  as_of: "2026-11-10T12:00:00-07:00",
  final: false,
  goals_hit: [],
  goals_missed: [],
  helped_sessions: [],
  gaps: [],
  followups: ["Team recap paragraph.", "Try one follow-up at work."],
};

describe("readoutHeading", () => {
  it("says so far before the conference ends", () => {
    expect(readoutHeading(false)).toBe("Your conference, so far");
    expect(readoutHeading(true)).toBe("Your conference");
  });
});

describe("parseNotEnoughGoal", () => {
  it("extracts the goal text from a gap line", () => {
    expect(parseNotEnoughGoal("Not enough feedback to tell: Ship faster")).toBe("Ship faster");
    expect(parseNotEnoughGoal("Other gap")).toBeNull();
  });
});

describe("evidence and gaps", () => {
  it("detects when check-ins support the readout", () => {
    expect(hasCheckInEvidence(base)).toBe(false);
    expect(hasCheckInEvidence({ ...base, goals_hit: ["Ship faster."] })).toBe(true);
  });

  it("splits unclear goals from other gaps", () => {
    const readout: Readout = {
      ...base,
      gaps: [
        "Summary built from your check-ins (AI unavailable).",
        "Not enough feedback to tell: Goal one",
        "Still deciding on inference tooling.",
      ],
    };
    expect(unclearGoals(readout)).toEqual(["Goal one"]);
    expect(contentGaps(readout)).toEqual(["Still deciding on inference tooling."]);
  });
});

describe("followups", () => {
  it("treats the first follow-up as the team recap draft", () => {
    expect(teamRecapDraft(base.followups)).toBe("Team recap paragraph.");
    expect(suggestionFollowups(base.followups)).toEqual(["Try one follow-up at work."]);
  });
});
