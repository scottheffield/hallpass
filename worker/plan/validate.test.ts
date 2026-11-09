import { describe, expect, it } from "vitest";
import type { PlanItem, Session } from "../../shared/types";
import { hasOverlaps, normalizePlanBreaks, validateDayPlan } from "./validate";

function session(id: string, start: string, end: string): Session {
  return {
    id,
    title: `Session ${id}`,
    start,
    end,
    room: "Room 151",
    track: "Platform",
    speakers: ["Alex Example"],
    abstract: "Operators share how they triage production incidents without inventing metrics.",
    search_text: "incident response kubernetes",
    speaker_text: "Alex Example, SRE",
  };
}

describe("validateDayPlan", () => {
  const sessions = new Map<string, Session>([
    ["a", session("a", "2026-11-10T10:00:00-07:00", "2026-11-10T10:40:00-07:00")],
    ["b", session("b", "2026-11-10T10:40:00-07:00", "2026-11-10T11:20:00-07:00")],
    ["c", session("c", "2026-11-10T11:00:00-07:00", "2026-11-10T11:40:00-07:00")],
  ]);

  it("drops overlaps and unknown ids", () => {
    const pinned: PlanItem[] = [{ session_id: "a", status: "planned", reason: "Pinned morning slot.", pinned: true }];
    const result = validateDayPlan(
      [
        { session_id: "b", reason: 'Matches your goal "incidents" from the abstract on failure signals.' },
        { session_id: "c", reason: 'Matches your goal "incidents" from the abstract on failure signals.' },
        { session_id: "missing", reason: "Should be dropped as unknown." },
      ],
      [],
      { pacing: "packed", candidateIds: new Set(["a", "b", "c"]), sessions, pinned },
    );
    expect(result.items.map((item) => item.session_id)).toEqual(["a", "b"]);
    expect(result.errors.some((err) => err.includes("Unknown"))).toBe(true);
    expect(result.errors.some((err) => err.includes("Overlap"))).toBe(true);
  });

  it("keeps pinned items and enforces pacing break limits", () => {
    const pinned: PlanItem[] = [{ session_id: "a", status: "planned", reason: "Stay for the keynote.", pinned: true }];
    const tooManyBreaks = [
      { start: "2026-11-10T12:00:00-07:00", end: "2026-11-10T12:30:00-07:00", note: "Lunch" },
      { start: "2026-11-10T15:00:00-07:00", end: "2026-11-10T15:30:00-07:00", note: "Coffee" },
      { start: "2026-11-10T16:00:00-07:00", end: "2026-11-10T16:30:00-07:00", note: "Walk" },
    ];
    const result = validateDayPlan(
      [{ session_id: "b", reason: 'Matches your goal "platform" from the abstract on service ownership.' }],
      tooManyBreaks,
      { pacing: "packed", candidateIds: new Set(["a", "b"]), sessions, pinned },
    );
    expect(result.items[0].session_id).toBe("a");
    expect(result.errors.some((err) => err.includes("Break count"))).toBe(true);
    expect(result.breaks).toHaveLength(1);
  });

  it("rejects breaks without the conference offset", () => {
    const result = validateDayPlan(
      [{ session_id: "b", reason: 'Matches your goal "platform" from the abstract on service ownership.' }],
      [{ start: "2026-11-10T12:00:00Z", end: "2026-11-10T13:00:00Z", note: "Lunch" }],
      { pacing: "light", candidateIds: new Set(["a", "b"]), sessions, pinned: [] },
    );
    expect(result.breaks).toHaveLength(0);
    expect(result.errors.some((err) => err.includes("Invalid break"))).toBe(true);
  });
});

describe("normalizePlanBreaks", () => {
  it("does not let a packed plan emit more than one break", () => {
    const breaks = [
      { start: "2026-11-10T12:00:00-07:00", end: "2026-11-10T13:00:00-07:00", note: "Lunch" },
      { start: "2026-11-10T15:00:00-07:00", end: "2026-11-10T15:45:00-07:00", note: "Coffee" },
      { start: "2026-11-10T16:30:00-07:00", end: "2026-11-10T17:00:00-07:00", note: "Walk" },
    ];
    expect(normalizePlanBreaks("packed", breaks)).toHaveLength(1);
    expect(normalizePlanBreaks("balanced", breaks)).toHaveLength(2);
    expect(normalizePlanBreaks("light", breaks)).toHaveLength(3);
  });
});

describe("hasOverlaps", () => {
  it("detects overlapping plan items", () => {
    const sessions = new Map<string, Session>([
      ["a", session("a", "2026-11-10T10:00:00-07:00", "2026-11-10T10:40:00-07:00")],
      ["b", session("b", "2026-11-10T10:20:00-07:00", "2026-11-10T11:00:00-07:00")],
    ]);
    const items: PlanItem[] = [
      { session_id: "a", status: "planned", reason: "First." },
      { session_id: "b", status: "planned", reason: "Second." },
    ];
    expect(hasOverlaps(items, sessions)).toBe(true);
  });
});
