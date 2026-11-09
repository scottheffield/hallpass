import { describe, expect, it } from "vitest";
import type { PlanItem, Session } from "../../shared/types";
import {
  formatTightChangeNote,
  gapMinutesBetween,
  hasOverlaps,
  isTightTransfer,
  normalizePlanBreaks,
  requiredTransferMinutes,
  validateDayPlan,
} from "./validate";

const room151 = "Salt Palace | Level 1 | 151";
const room255 = "Salt Palace | Level 2 | 255 BC";
const hyattBallroom = "Hyatt Regency | Level 4 | Regency Ballroom B";

function session(
  id: string,
  start: string,
  end: string,
  room: string = room151,
): Session {
  return {
    id,
    title: `Session ${id}`,
    start,
    end,
    room,
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

describe("tight transfers", () => {
  it("doubles required walking time for light pacing", () => {
    expect(requiredTransferMinutes("balanced", room151, hyattBallroom)).toBe(12);
    expect(requiredTransferMinutes("light", room151, hyattBallroom)).toBe(24);
  });

  it("flags a gap shorter than transferMinutes", () => {
    const prev = session("prev", "2026-11-10T10:00:00-07:00", "2026-11-10T10:40:00-07:00", room255);
    const next = session("next", "2026-11-10T10:50:00-07:00", "2026-11-10T11:30:00-07:00", hyattBallroom);
    expect(gapMinutesBetween(prev.end, next.start)).toBe(10);
    expect(isTightTransfer("balanced", prev, next)).toBe(true);
  });

  it("formats clash notes with shared walking minutes when the gap is shorter than the walk", () => {
    expect(formatTightChangeNote("balanced", room255, hyattBallroom, 10)).toBe(
      "Tight change: the Hyatt Regency is about 12 minutes from 255 BC, and you have 10.",
    );
  });

  it("explains light pacing when the gap fits the walk but not the doubled buffer", () => {
    expect(formatTightChangeNote("light", room255, hyattBallroom, 15)).toBe(
      "Tight change: you asked for a relaxed pace. the Hyatt Regency is about 12 minutes from 255 BC, and you have 15; allow about 24 minutes between sessions.",
    );
  });

  it("adds a clash_note when the pick stays on a tight cross-building gap", () => {
    const sessions = new Map<string, Session>([
      ["a", session("a", "2026-11-10T10:00:00-07:00", "2026-11-10T10:40:00-07:00", room255)],
      ["b", session("b", "2026-11-10T10:50:00-07:00", "2026-11-10T11:30:00-07:00", hyattBallroom)],
    ]);
    const reason = 'Matches your goal "platform" from the abstract on service ownership.';
    const result = validateDayPlan(
      [{ session_id: "b", reason }],
      [],
      {
        pacing: "balanced",
        candidateIds: new Set(["a", "b"]),
        sessions,
        pinned: [{ session_id: "a", status: "planned", reason: "Pinned first slot.", pinned: true }],
      },
    );
    expect(result.items.map((item) => item.session_id)).toEqual(["a", "b"]);
    expect(result.items[1]?.clash_note).toBe(
      "Tight change: the Hyatt Regency is about 12 minutes from 255 BC, and you have 10.",
    );
  });

  it("swaps to a closer overlapping candidate when one exists", () => {
    const sessions = new Map<string, Session>([
      ["a", session("a", "2026-11-10T10:00:00-07:00", "2026-11-10T10:40:00-07:00", room255)],
      [
        "b",
        session(
          "b",
          "2026-11-10T10:50:00-07:00",
          "2026-11-10T11:30:00-07:00",
          hyattBallroom,
        ),
      ],
      [
        "c",
        session(
          "c",
          "2026-11-10T10:50:00-07:00",
          "2026-11-10T11:30:00-07:00",
          room151,
        ),
      ],
    ]);
    const reason = 'Matches your goal "platform" from the abstract on service ownership.';
    const result = validateDayPlan(
      [{ session_id: "b", reason }],
      [],
      {
        pacing: "balanced",
        candidateIds: new Set(["a", "b", "c"]),
        sessions,
        pinned: [{ session_id: "a", status: "planned", reason: "Pinned first slot.", pinned: true }],
      },
    );
    expect(result.items[1]?.session_id).toBe("c");
    expect(result.items[1]?.clash_note).toBeUndefined();
    expect(result.items[1]?.beat_alternative).toBeUndefined();
    expect(result.items[1]?.reason).toContain("Closer room for the walk from 255 BC:");
    expect(result.items[1]?.reason).toContain("Session c");
    expect(result.items[1]?.reason).not.toContain("service ownership");
  });

  it("on swap drops model fields and does not keep the model clash_note", () => {
    const sessions = new Map<string, Session>([
      ["a", session("a", "2026-11-10T10:00:00-07:00", "2026-11-10T10:40:00-07:00", room255)],
      ["b", session("b", "2026-11-10T10:50:00-07:00", "2026-11-10T11:30:00-07:00", hyattBallroom)],
      ["c", session("c", "2026-11-10T10:50:00-07:00", "2026-11-10T11:30:00-07:00", room151)],
    ]);
    const result = validateDayPlan(
      [
        {
          session_id: "b",
          reason: 'Matches your goal "platform" from the abstract on service ownership.',
          beat_alternative: { session_id: "c", why: "Wrong session after swap." },
          clash_note: "Model overlap note that should not block the walk warning.",
        },
      ],
      [],
      {
        pacing: "balanced",
        candidateIds: new Set(["a", "b", "c"]),
        sessions,
        pinned: [{ session_id: "a", status: "planned", reason: "Pinned first slot.", pinned: true }],
      },
    );
    expect(result.items[1]?.session_id).toBe("c");
    expect(result.items[1]?.beat_alternative).toBeUndefined();
    expect(result.items[1]?.clash_note).toBeUndefined();
  });

  it("replaces a model clash_note with the computed tight note when the pick stays tight", () => {
    const sessions = new Map<string, Session>([
      ["a", session("a", "2026-11-10T10:00:00-07:00", "2026-11-10T10:40:00-07:00", room255)],
      ["b", session("b", "2026-11-10T10:50:00-07:00", "2026-11-10T11:30:00-07:00", hyattBallroom)],
    ]);
    const result = validateDayPlan(
      [
        {
          session_id: "b",
          reason: 'Matches your goal "platform" from the abstract on service ownership.',
          clash_note: "Model overlap note that should not block the walk warning.",
        },
      ],
      [],
      {
        pacing: "balanced",
        candidateIds: new Set(["a", "b"]),
        sessions,
        pinned: [{ session_id: "a", status: "planned", reason: "Pinned first slot.", pinned: true }],
      },
    );
    expect(result.items[1]?.clash_note).toBe(
      "Tight change: the Hyatt Regency is about 12 minutes from 255 BC, and you have 10.",
    );
  });

  it("does not swap to a closer room that is still a tight transfer", () => {
    const sessions = new Map<string, Session>([
      ["a", session("a", "2026-11-10T10:00:00-07:00", "2026-11-10T10:40:00-07:00", room255)],
      ["b", session("b", "2026-11-10T10:50:00-07:00", "2026-11-10T11:30:00-07:00", hyattBallroom)],
      ["c", session("c", "2026-11-10T10:42:00-07:00", "2026-11-10T11:22:00-07:00", room151)],
    ]);
    const result = validateDayPlan(
      [{ session_id: "b", reason: 'Matches your goal "platform" from the abstract on service ownership.' }],
      [],
      {
        pacing: "balanced",
        candidateIds: new Set(["a", "b", "c"]),
        sessions,
        pinned: [{ session_id: "a", status: "planned", reason: "Pinned first slot.", pinned: true }],
      },
    );
    expect(result.items[1]?.session_id).toBe("b");
    expect(result.items[1]?.clash_note).toContain("about 12 minutes");
  });

  it("still flags unknown rooms because transferMinutes errs long", () => {
    const mystery = "Mystery Venue";
    const sessions = new Map<string, Session>([
      ["a", session("a", "2026-11-10T10:00:00-07:00", "2026-11-10T10:40:00-07:00", room151)],
      ["b", session("b", "2026-11-10T10:45:00-07:00", "2026-11-10T11:25:00-07:00", mystery)],
    ]);
    const result = validateDayPlan(
      [{ session_id: "b", reason: 'Matches your goal "platform" from the abstract on service ownership.' }],
      [],
      {
        pacing: "packed",
        candidateIds: new Set(["a", "b"]),
        sessions,
        pinned: [{ session_id: "a", status: "planned", reason: "Pinned first slot.", pinned: true }],
      },
    );
    expect(result.items[1]?.clash_note).toMatch(/^Tight change:/);
    expect(result.items[1]?.clash_note).toContain("about 12 minutes");
  });
});
