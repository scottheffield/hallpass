import { describe, expect, it } from "vitest";
import type { PlanItem, Session } from "../../shared/types";
import { basicDayPlan } from "./basic";
import type { PlanCandidate } from "./candidates";
import { hasOverlaps } from "./validate";

function session(id: string, start: string, end: string, abstract: string): Session {
  return {
    id,
    title: `Talk ${id}`,
    start,
    end,
    room: "Grand Ballroom H",
    track: "Observability",
    speakers: ["Pat Operator"],
    abstract,
    search_text: abstract,
    speaker_text: "Pat Operator, SRE",
  };
}

describe("basicDayPlan", () => {
  it("builds at least three non-overlapping picks with template reasons", () => {
    const s1 = session("1", "2026-11-10T10:00:00-07:00", "2026-11-10T10:40:00-07:00", "Incident triage on Kubernetes.");
    const s2 = session("2", "2026-11-10T10:40:00-07:00", "2026-11-10T11:20:00-07:00", "Inference cost controls.");
    const s3 = session("3", "2026-11-10T11:20:00-07:00", "2026-11-10T12:00:00-07:00", "Platform SLO design.");
    const s4 = session("4", "2026-11-10T14:00:00-07:00", "2026-11-10T14:40:00-07:00", "Queueing for GPU jobs.");
    const sessions = new Map<string, Session>([
      [s1.id, s1],
      [s2.id, s2],
      [s3.id, s3],
      [s4.id, s4],
    ]);
    const candidates: PlanCandidate[] = [
      { session: s3, score: 5, matched_field: "search_text", matched_goal: "incident response" },
      { session: s1, score: 9, matched_field: "search_text", matched_goal: "incident response" },
      { session: s2, score: 7, matched_field: "search_text", matched_goal: "inference" },
      { session: s4, score: 6, matched_field: "search_text", matched_goal: "platform" },
    ];
    const pinned: PlanItem[] = [];
    const { items } = basicDayPlan("2026-11-10", "balanced", candidates, sessions, pinned);
    expect(items.length).toBeGreaterThanOrEqual(3);
    expect(items.every((item) => item.reason.includes("goal"))).toBe(true);
    expect(hasOverlaps(items, sessions)).toBe(false);
  });

  it("fills only from the requested day when candidates are empty", () => {
    const day10 = session("10a", "2026-11-10T10:00:00-07:00", "2026-11-10T10:40:00-07:00", "Day ten talk.");
    const day11 = session("11a", "2026-11-11T10:00:00-07:00", "2026-11-11T10:40:00-07:00", "Day eleven talk.");
    const day10b = session("10b", "2026-11-10T11:00:00-07:00", "2026-11-10T11:40:00-07:00", "Another ten.");
    const day10c = session("10c", "2026-11-10T12:00:00-07:00", "2026-11-10T13:00:00-07:00", "Third ten.");
    const allAccess = {
      ...day10,
      id: "aa",
      start: "2026-11-10T09:00:00-07:00",
      end: "2026-11-10T17:00:00-07:00",
      all_access: true,
    };
    const sessions = new Map<string, Session>([
      [day10.id, day10],
      [day11.id, day11],
      [day10b.id, day10b],
      [day10c.id, day10c],
      [allAccess.id, allAccess],
    ]);
    const { items } = basicDayPlan("2026-11-10", "balanced", [], sessions, []);
    expect(items.length).toBeGreaterThanOrEqual(3);
    for (const item of items) {
      const row = sessions.get(item.session_id);
      expect(row?.start.slice(0, 10)).toBe("2026-11-10");
      expect(row?.all_access).not.toBe(true);
    }
    expect(items.some((item) => item.session_id === "11a")).toBe(false);
  });
});
