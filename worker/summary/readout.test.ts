import { describe, expect, it } from "vitest";
import { fixturePlan, fixtureProfile } from "../lib/fixtures";
import type { CheckIn, Plan } from "../../shared/types";
import {
  buildFallbackReadout,
  helpedSessionIds,
  isReadoutFinal,
  lastPlannedBlockEndMs,
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
    expect(helpedSessionIds(checkins)).toEqual(["s1", "s2"]);
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
    });
    expect(readout.helped_sessions).toEqual(["s-incident"]);
    expect(readout.goals_hit.length).toBeGreaterThan(0);
    expect(readout.followups[0]?.length).toBeGreaterThan(20);
    expect((readout.gap_themes ?? []).every((id) => typeof id === "string")).toBe(true);
  });
});
