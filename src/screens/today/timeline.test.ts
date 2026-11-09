import { describe, expect, it } from "vitest";
import demoPlan from "../../../shared/fixtures/demo-plan.json";
import sample from "../../../shared/fixtures/sessions-sample.json";
import type { Plan, Session } from "../../../shared/types";
import {
  buildDayTimeline,
  conferenceDateKey,
  formatTimeRange,
  nextPlannedSession,
  resolveTodayHeading,
} from "./timeline";

const sessions = sample.sessions as Session[];
const plan = demoPlan as Plan;

describe("today timeline", () => {
  it("orders sessions and breaks for a conference day", () => {
    const day = plan.days["2026-11-10"];
    const blocks = buildDayTimeline(sessions, day);
    expect(blocks.length).toBeGreaterThan(day.items.length);
    expect(blocks[0]?.kind).toBe("session");
    expect(blocks.some((block) => block.kind === "break")).toBe(true);
    for (let index = 1; index < blocks.length; index++) {
      const prev = blocks[index - 1]!;
      const current = blocks[index]!;
      expect(Date.parse(current.start)).toBeGreaterThanOrEqual(Date.parse(prev.start));
    }
  });

  it("drops plan items that are not in the agenda", () => {
    const day = {
      items: [{ session_id: "missing-id", status: "planned" as const, reason: "test" }],
      breaks: [],
    };
    expect(buildDayTimeline(sessions, day)).toEqual([]);
  });

  it("picks the next planned session from the demo clock morning", () => {
    const blocks = buildDayTimeline(sessions, plan.days["2026-11-10"]);
    const atNine = Date.parse("2026-11-10T09:00:00-07:00");
    const next = nextPlannedSession(blocks, atNine);
    expect(next?.block.session.id).toBe("1246200");
    expect(next?.heading).toContain("11:30");
  });

  it("uses Mountain Time for the conference date key", () => {
    const instant = new Date("2026-11-11T06:30:00.000Z");
    expect(conferenceDateKey(instant)).toBe("2026-11-10");
  });

  it("describes the following day when today is finished", () => {
    const blocks = buildDayTimeline(sessions, plan.days["2026-11-10"]);
    const afterLast = Date.parse("2026-11-10T23:00:00-07:00");
    const heading = resolveTodayHeading("2026-11-10", blocks, afterLast, plan, sessions);
    expect(heading.kind).toBe("day-done");
    if (heading.kind === "day-done") {
      expect(heading.nextDayKey).toBe("2026-11-11");
      expect(heading.nextSessionTime).toBe(formatTimeRange("2026-11-11T11:00:00-07:00", "2026-11-11T11:30:00-07:00"));
    }
  });
});
