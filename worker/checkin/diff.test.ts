import { describe, expect, it } from "vitest";
import { diffPlanDay, type PlanDay } from "./diff";

const DROPPED_ID = "1250865";
const KEPT_ID = "1246200";
const THIRD_ID = "1250770";

const base = (overrides: Partial<PlanDay> = {}): PlanDay => ({
  items: [
    { session_id: KEPT_ID, status: "done", reason: "done" },
    { session_id: "1233585", status: "planned", reason: "Platform talk on Level 2." },
    {
      session_id: DROPPED_ID,
      status: "planned",
      reason: "Cache-aware LLM inference operations on Kubernetes.",
    },
    { session_id: THIRD_ID, status: "planned", reason: "Missing context in incident response." },
  ],
  breaks: [],
  ...overrides,
});

describe("diffPlanDay", () => {
  it("returns nothing when the day is unchanged", () => {
    const day = base();
    expect(diffPlanDay(day, structuredClone(day))).toEqual([]);
  });

  it("detects a removed later session with agenda title, time, and check-in reason", () => {
    const before = base();
    const after = base({ items: before.items.filter((item) => item.session_id !== DROPPED_ID) });
    const changes = diffPlanDay(before, after, {
      signal: { session_id: KEPT_ID, worth_it: "mixed", moved_goal: "no" },
    });
    expect(changes).toEqual([
      {
        kind: "removed",
        session_id: DROPPED_ID,
        text: `Dropped What the Docs Don't Tell You: A Telecom's Year Operating Cache-Aware LLM Inference on Kubernetes at 12:20: you said the last session didn't move your goal.`,
      },
    ]);
    for (const change of changes) {
      expect(change.text).not.toMatch(/\(\d+\)/);
      expect(change.text).not.toContain(DROPPED_ID);
    }
  });

  it("detects an added session with title and time from the agenda", () => {
    const before = base();
    const after = base({
      items: [
        ...before.items,
        {
          session_id: "1246033",
          status: "planned",
          reason: "EarnIn's CNCF testing framework.",
        },
      ],
    });
    const changes = diffPlanDay(before, after);
    expect(changes).toEqual([
      {
        kind: "added",
        session_id: "1246033",
        text: "Added When Infrastructure Breaks in Production: How EarnIn Brought Testing to the Full CNCF Stack at 12:20: EarnIn's CNCF testing framework.",
      },
    ]);
    expect(changes[0]?.text).not.toContain("1246033");
  });

  it("detects reorder among planned items", () => {
    const before = base();
    const after = base({
      items: [
        before.items[0],
        before.items[3],
        before.items[1],
        before.items[2],
      ],
    });
    const changes = diffPlanDay(before, after);
    const moved = changes.find((c) => c.kind === "moved");
    expect(moved?.session_id).toBe(THIRD_ID);
    expect(moved?.text).toContain("Moved ");
    expect(moved?.text).toContain("in today's order.");
    expect(moved?.text).not.toContain(THIRD_ID);
  });

  it("detects break changes", () => {
    const before = base();
    const after = base({
      breaks: [{ start: "2026-11-10T12:00:00-07:00", end: "2026-11-10T12:15:00-07:00", note: "Pause" }],
    });
    expect(diffPlanDay(before, after)).toEqual([{ kind: "break", text: "Adjusted a break for the rest of today." }]);
  });

  it("caps output at three bullets", () => {
    const before = base({
      items: [
        { session_id: KEPT_ID, status: "done", reason: "done" },
        { session_id: "1233585", status: "planned", reason: "b" },
        { session_id: DROPPED_ID, status: "planned", reason: "c" },
        { session_id: THIRD_ID, status: "planned", reason: "d" },
        { session_id: "1246033", status: "planned", reason: "e" },
      ],
    });
    const after: PlanDay = {
      items: [
        { session_id: KEPT_ID, status: "done", reason: "done" },
        { session_id: "1244963", status: "planned", reason: "f" },
        { session_id: "1247858", status: "planned", reason: "g" },
        { session_id: "1248310", status: "planned", reason: "h" },
        { session_id: "1247612", status: "planned", reason: "i" },
      ],
      breaks: [{ start: "2026-11-10T16:00:00-07:00", end: "2026-11-10T16:15:00-07:00", note: "New" }],
    };
    expect(diffPlanDay(before, after).length).toBeLessThanOrEqual(3);
  });

  it("never puts raw session ids in attendee-facing text", () => {
    const before = base();
    const after = base({ items: before.items.filter((item) => item.session_id !== DROPPED_ID) });
    const changes = diffPlanDay(before, after, {
      signal: { session_id: KEPT_ID, worth_it: "no", moved_goal: "yes" },
    });
    for (const change of changes) {
      expect(change.text).not.toMatch(/\b\d{5,}\b/);
    }
  });
});
