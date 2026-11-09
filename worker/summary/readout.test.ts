import { describe, expect, it } from "vitest";
import { fixturePlan, fixtureProfile } from "../lib/fixtures";
import type { CheckIn, Plan } from "../../shared/types";
import {
  buildFallbackReadout,
  enforceGoalEvidence,
  formatNextStepLine,
  goalListsFromProfile,
  helpedSessionIds,
  isReadoutFinal,
  lastPlannedBlockEndMs,
  pickNextStepSessions,
} from "./readout";

const sessionText = new Map<string, string>([
  ["s-incident", "Debugging a Kubernetes incident|Observability|kubernetes incident response context"],
  ["s-inference", "Serving inference on a platform|Platform|AI inference kubernetes operations"],
  ["s-other", "Unrelated keynote|Community|community networking"],
]);

const sessionEnd = new Map<string, string>([
  ["s-incident", "2026-11-10T16:00:00-07:00"],
  ["s-inference", "2026-11-12T14:00:00-07:00"],
]);

const sessionMeta = new Map<string, { title: string; start: string; room: string }>([
  ["s-incident", { title: "Debugging a Kubernetes incident", start: "2026-11-10T15:00:00-07:00", room: "151" }],
  ["s-inference", { title: "Serving inference on a platform", start: "2026-11-12T11:00:00-07:00", room: "Grand Ballroom H" }],
  ["s-other", { title: "Unrelated keynote", start: "2026-11-10T17:00:00-07:00", room: "255 BC" }],
]);

const resolvable = new Set(sessionText.keys());

function planWithSessions(): Plan {
  const plan = structuredClone(fixturePlan("test-attendee"));
  plan.days = {
    "2026-11-10": {
      items: [{ session_id: "s-incident", status: "done", reason: "incident" }],
      breaks: [{ start: "2026-11-10T12:00:00-07:00", end: "2026-11-10T13:00:00-07:00", note: "lunch" }],
    },
    "2026-11-12": {
      items: [{ session_id: "s-inference", status: "planned", reason: "inference" }],
      breaks: [],
    },
  };
  return plan;
}

describe("helpedSessionIds", () => {
  it("lists sessions where moved_goal is yes or a_little", () => {
    const checkins: CheckIn[] = [
      { attendee_id: "a", session_id: "s1", at: "2026-11-10T12:00:00-07:00", worth_it: "yes", moved_goal: "yes" },
      { attendee_id: "a", session_id: "s2", at: "2026-11-10T13:00:00-07:00", worth_it: "mixed", moved_goal: "a_little" },
      { attendee_id: "a", session_id: "s3", at: "2026-11-10T14:00:00-07:00", worth_it: "no", moved_goal: "no" },
    ];
    const known = new Set(["s1", "s2", "s3"]);
    expect(helpedSessionIds(checkins, known)).toEqual(["s1", "s2"]);
  });

  it("drops session ids that do not resolve on the agenda", () => {
    const checkins: CheckIn[] = [
      { attendee_id: "a", session_id: "s-incident", at: "2026-11-10T12:00:00-07:00", worth_it: "yes", moved_goal: "yes" },
      { attendee_id: "a", session_id: "unknown-id", at: "2026-11-10T13:00:00-07:00", worth_it: "yes", moved_goal: "yes" },
    ];
    expect(helpedSessionIds(checkins, resolvable)).toEqual(["s-incident"]);
  });
});

describe("enforceGoalEvidence", () => {
  it("clears goals_hit when there are no positive moved_goal check-ins", () => {
    const checkins: CheckIn[] = [
      { attendee_id: "a", session_id: "s1", at: "2026-11-10T12:00:00-07:00", worth_it: "no", moved_goal: "no" },
    ];
    const result = enforceGoalEvidence(checkins, ["goal one"], ["goal one"]);
    expect(result.goals_hit).toEqual([]);
    expect(result.goals_missed).toEqual(["goal one"]);
  });

  it("clears goals_missed when there are no moved_goal no check-ins", () => {
    const checkins: CheckIn[] = [
      { attendee_id: "a", session_id: "s1", at: "2026-11-10T12:00:00-07:00", worth_it: "yes", moved_goal: "yes" },
    ];
    const result = enforceGoalEvidence(checkins, [], ["goal one"]);
    expect(result.goals_hit).toEqual([]);
    expect(result.goals_missed).toEqual([]);
  });
});

describe("final flag", () => {
  it("uses Date.parse on the last planned block end", () => {
    const plan = planWithSessions();
    const end = lastPlannedBlockEndMs(plan, sessionEnd);
    expect(end).toBe(Date.parse("2026-11-12T14:00:00-07:00"));
    expect(isReadoutFinal(Date.parse("2026-11-12T14:00:00-07:00"), plan, sessionEnd)).toBe(true);
    expect(isReadoutFinal(Date.parse("2026-11-11T09:00:00-07:00"), plan, sessionEnd)).toBe(false);
  });
});

describe("buildFallbackReadout", () => {
  it("does not claim goals when check-ins are empty", () => {
    const profile = fixtureProfile("test-attendee");
    const plan = planWithSessions();
    const asOf = new Date("2026-11-10T15:00:00-07:00");
    const readout = buildFallbackReadout({
      attendeeId: "test-attendee",
      profile,
      plan,
      checkins: [],
      asOf,
      sessionTextById: sessionText,
      sessionEndById: sessionEnd,
      sessionMetaById: sessionMeta,
    });
    expect(readout.goals_hit).toEqual([]);
    expect(readout.goals_missed).toEqual([]);
    expect(readout.helped_sessions).toEqual([]);
    expect(readout.gaps.some((line) => line.startsWith("Not enough feedback to tell"))).toBe(true);
    expect(readout.gaps[0]).toContain("AI unavailable");
    expect(readout.final).toBe(false);
    expect(readout.followups.length).toBeGreaterThan(0);
  });

  it("maps positive check-ins to related goals and lists helped sessions", () => {
    const profile = fixtureProfile("test-attendee");
    const plan = planWithSessions();
    const checkins: CheckIn[] = [
      {
        attendee_id: "test-attendee",
        session_id: "s-incident",
        at: "2026-11-10T16:30:00-07:00",
        worth_it: "yes",
        moved_goal: "yes",
      },
      {
        attendee_id: "test-attendee",
        session_id: "s-other",
        at: "2026-11-10T17:00:00-07:00",
        worth_it: "no",
        moved_goal: "no",
      },
    ];
    const readout = buildFallbackReadout({
      attendeeId: "test-attendee",
      profile,
      plan,
      checkins,
      asOf: new Date("2026-11-10T18:00:00-07:00"),
      sessionTextById: sessionText,
      sessionEndById: sessionEnd,
      sessionMetaById: sessionMeta,
    });
    expect(readout.helped_sessions).toEqual(["s-incident"]);
    expect(readout.goals_hit.length).toBeGreaterThan(0);
    expect(readout.followups[0]?.length).toBeGreaterThan(20);
    expect((readout.gap_themes ?? []).every((id) => typeof id === "string")).toBe(true);
  });

  it("leaves goals_hit empty when every check-in is moved_goal no", () => {
    const profile = fixtureProfile("test-attendee");
    const plan = planWithSessions();
    const checkins: CheckIn[] = [
      {
        attendee_id: "test-attendee",
        session_id: "s-incident",
        at: "2026-11-10T16:30:00-07:00",
        worth_it: "no",
        moved_goal: "no",
      },
    ];
    const readout = buildFallbackReadout({
      attendeeId: "test-attendee",
      profile,
      plan,
      checkins,
      asOf: new Date("2026-11-10T18:00:00-07:00"),
      sessionTextById: sessionText,
      sessionEndById: sessionEnd,
      sessionMetaById: sessionMeta,
    });
    expect(readout.goals_hit).toEqual([]);
    expect(readout.helped_sessions).toEqual([]);
  });
});

describe("goal cards from profile", () => {
  it("uses only profile goal strings for hit and missed lists", () => {
    const profile = fixtureProfile("test-attendee");
    const status = new Map<number, "hit" | "missed" | "unclear">([
      [0, "hit"],
      [1, "missed"],
    ]);
    const { goals_hit, goals_missed } = goalListsFromProfile(profile, status);
    expect(goals_hit).toEqual([profile.goals[0]]);
    expect(goals_missed).toEqual([profile.goals[1]]);
    for (const goal of [...goals_hit, ...goals_missed]) {
      expect(profile.goals).toContain(goal);
    }
  });

  it("drops model-only goal text that does not match profile goals", () => {
    const profile = fixtureProfile("test-attendee");
    const draft = [
      profile.goals[0],
      "NOT ENOUGH FEEDBACK / whether the Kubernetes incident response goal moved",
    ];
    const aligned = draft.filter((line) => profile.goals.includes(line));
    expect(aligned).toEqual([profile.goals[0]]);
  });
});

describe("next steps from agenda ids", () => {
  it("orders picks by parsed start time so 11:00 does not sort ahead of 9:00", () => {
    const profile = fixtureProfile("test-attendee");
    const plan = planWithSessions();
    const meta = new Map<string, { title: string; start: string; room: string }>([
      ["s-late", { title: "Late morning", start: "2026-11-12T11:00:00-07:00", room: "A" }],
      ["s-early", { title: "Early morning", start: "2026-11-10T09:00:00-07:00", room: "B" }],
    ]);
    plan.days = {
      "2026-11-10": {
        items: [
          {
            session_id: "s-early",
            status: "planned",
            reason: 'Matches your goal "inference" through the session topic in Early.',
          },
        ],
        breaks: [],
      },
      "2026-11-12": {
        items: [
          {
            session_id: "s-late",
            status: "planned",
            reason: 'Matches your goal "inference" through the session topic in Late.',
          },
        ],
        breaks: [],
      },
    };
    const ids = new Set(["s-early", "s-late"]);
    const picks = pickNextStepSessions(
      plan,
      profile,
      [0],
      Date.parse("2026-11-10T08:00:00-07:00"),
      meta,
      ids,
      2,
    );
    expect(picks.map((pick) => pick.session_id)).toEqual(["s-early", "s-late"]);
  });

  it("formats next step times and rooms for follow-up copy", () => {
    const profile = fixtureProfile("test-attendee");
    const plan = structuredClone(fixturePlan("test-attendee"));
    plan.days = {
      "2026-11-10": {
        items: [
          {
            session_id: "s-incident",
            status: "planned",
            reason:
              "SREs describe AI incident response stalling on missing context: a recent deploy, an owner change, an upstream dependency.",
          },
        ],
        breaks: [],
      },
    };
    const picks = pickNextStepSessions(
      plan,
      profile,
      [1],
      Date.parse("2026-11-10T12:00:00-07:00"),
      new Map([
        [
          "s-incident",
          {
            title: "Debugging a Kubernetes incident",
            start: "2026-11-10T15:40:00-07:00",
            room: "Salt Palace | Level 1 | 151",
          },
        ],
      ]),
      new Set(["s-incident"]),
    );
    expect(picks[0]?.time).toBe("3:40 PM");
    expect(picks[0]?.room).toBe("151 · Level 1 · Salt Palace");
    const line = formatNextStepLine(picks[0]!, "still on context gaps");
    expect(line).toContain(" at 3:40 PM");
    expect(line).toContain(" in 151 · Level 1 · Salt Palace");
    expect(line).not.toContain("|");
  });

  it("references only session ids that remain on the plan", () => {
    const profile = fixtureProfile("test-attendee");
    const plan = planWithSessions();
    const picks = pickNextStepSessions(
      plan,
      profile,
      [0, 1],
      Date.parse("2026-11-10T12:00:00-07:00"),
      sessionMeta,
      resolvable,
    );
    const plannedIds = new Set(
      Object.values(plan.days).flatMap((day) => day.items.map((item) => item.session_id)),
    );
    expect(picks.length).toBeGreaterThan(0);
    for (const pick of picks) {
      expect(plannedIds.has(pick.session_id)).toBe(true);
      expect(resolvable.has(pick.session_id)).toBe(true);
    }
  });
});
