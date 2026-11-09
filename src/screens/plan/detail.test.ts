import { describe, expect, it } from "vitest";
import type { PlanItem } from "../../../shared/types";
import { sessionDetailBullets } from "./detail";

const item: PlanItem = {
  session_id: "1",
  status: "planned",
  reason: "Matches your goal.",
  beat_alternative: {
    session_id: "2",
    why: "This one stays closer to incident response.",
  },
  clash_note: "Overlaps another talk in room 255.",
};

describe("sessionDetailBullets", () => {
  it("includes beat-alternative and clash lines", () => {
    expect(sessionDetailBullets(item, "Platform overview")).toEqual([
      "Picked over Platform overview: This one stays closer to incident response.",
      "Overlaps another talk in room 255.",
    ]);
  });

  it("falls back to the session id when no title is given", () => {
    const [first] = sessionDetailBullets(item);
    expect(first).toContain("Picked over 2:");
  });

  it("caps at three bullets", () => {
    const heavy: PlanItem = {
      ...item,
      clash_note: "One. Two. Three.",
      beat_alternative: { session_id: "x", why: "a".repeat(200) },
    };
    expect(sessionDetailBullets(heavy).length).toBeLessThanOrEqual(3);
  });
});
