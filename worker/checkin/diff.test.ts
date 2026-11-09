import { describe, expect, it } from "vitest";
import { diffPlanDay, type PlanDay } from "./diff";

const base = (overrides: Partial<PlanDay> = {}): PlanDay => ({
  items: [
    { session_id: "a", status: "done", reason: "done" },
    { session_id: "b", status: "planned", reason: "b" },
    { session_id: "c", status: "planned", reason: "c" },
  ],
  breaks: [],
  ...overrides,
});

describe("diffPlanDay", () => {
  it("returns nothing when the day is unchanged", () => {
    const day = base();
    expect(diffPlanDay(day, structuredClone(day))).toEqual([]);
  });

  it("detects a removed later session", () => {
    const before = base();
    const after = base({ items: before.items.filter((item) => item.session_id !== "c") });
    expect(diffPlanDay(before, after)).toEqual([
      { kind: "removed", session_id: "c", text: "Dropped a later session (c)." },
    ]);
  });

  it("detects an added session", () => {
    const before = base();
    const after = base({
      items: [...before.items, { session_id: "d", status: "planned", reason: "d" }],
    });
    expect(diffPlanDay(before, after)).toEqual([
      { kind: "added", session_id: "d", text: "Added session d to the rest of today." },
    ]);
  });

  it("detects reorder among planned items", () => {
    const before = base();
    const after = base({
      items: [
        before.items[0],
        { session_id: "c", status: "planned", reason: "c" },
        { session_id: "b", status: "planned", reason: "b" },
      ],
    });
    const changes = diffPlanDay(before, after);
    expect(changes.some((c) => c.kind === "moved" && c.session_id === "c")).toBe(true);
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
        { session_id: "a", status: "done", reason: "done" },
        { session_id: "b", status: "planned", reason: "b" },
        { session_id: "c", status: "planned", reason: "c" },
        { session_id: "d", status: "planned", reason: "d" },
        { session_id: "e", status: "planned", reason: "e" },
      ],
    });
    const after: PlanDay = {
      items: [
        { session_id: "a", status: "done", reason: "done" },
        { session_id: "f", status: "planned", reason: "f" },
        { session_id: "g", status: "planned", reason: "g" },
        { session_id: "h", status: "planned", reason: "h" },
        { session_id: "i", status: "planned", reason: "i" },
      ],
      breaks: [{ start: "2026-11-10T16:00:00-07:00", end: "2026-11-10T16:15:00-07:00", note: "New" }],
    };
    expect(diffPlanDay(before, after).length).toBeLessThanOrEqual(3);
  });
});
