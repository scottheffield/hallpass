import { describe, expect, it } from "vitest";
import demoPlan from "../../../shared/fixtures/demo-plan.json";
import sample from "../../../shared/fixtures/sessions-sample.json";
import type { Plan, Session } from "../../../shared/types";
import type { PlanBreak } from "../../../shared/types";
import {
  activeBreak,
  breakDetail,
  breakFollowingSession,
  breakTitle,
  buildDayTimeline,
  conferenceDateKey,
  formatBreakTime,
  formatTime,
  formatTimeRange,
  nextPlannedSession,
  resolveTodayHeading,
  restOfTodayTimeline,
  type TodayBreakBlock,
  type TodaySessionBlock,
  type TodayTimelineBlock,
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

  it("drops the hero next session from the list timeline", () => {
    const blocks = buildDayTimeline(sessions, plan.days["2026-11-10"]);
    const atNine = Date.parse("2026-11-10T09:00:00-07:00");
    const next = nextPlannedSession(blocks, atNine);
    const list = restOfTodayTimeline(blocks, next);
    expect(list.some((block) => block.kind === "session" && block.session.id === next?.block.session.id)).toBe(
      false,
    );
    expect(list.length).toBe(blocks.length - 1);
    expect(list).toEqual(blocks.filter((block) => block !== next?.block));
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

function breakBlock(start: string, end: string, note: string): TodayBreakBlock {
  const planBreak: PlanBreak = { start, end, note };
  return { kind: "break", planBreak, start, end };
}

function sessionBlock(session: Session): TodaySessionBlock {
  return {
    kind: "session",
    session,
    item: { session_id: session.id, status: "planned", reason: "on plan" },
    start: session.start,
    end: session.end,
  };
}

describe("break helpers", () => {
  it("uses start-inclusive and end-exclusive active break windows", () => {
    const blocks: TodayTimelineBlock[] = [
      breakBlock("2026-11-10T12:00:00-07:00", "2026-11-10T12:30:00-07:00", "Coffee"),
    ];
    expect(activeBreak(blocks, Date.parse("2026-11-10T11:59:59-07:00"))).toBeNull();
    expect(activeBreak(blocks, Date.parse("2026-11-10T12:00:00-07:00"))?.planBreak.note).toBe("Coffee");
    expect(activeBreak(blocks, Date.parse("2026-11-10T12:29:59-07:00"))?.planBreak.note).toBe("Coffee");
    expect(activeBreak(blocks, Date.parse("2026-11-10T12:30:00-07:00"))).toBeNull();
  });

  it("picks the first break at or after a session ends", () => {
    const session = sessions.find((row) => row.id === "1246200")!;
    const blocks = buildDayTimeline(sessions, plan.days["2026-11-10"]);
    const block = sessionBlock(session);
    const following = breakFollowingSession(blocks, block);
    expect(following?.start).toBe("2026-11-10T12:50:00-07:00");
  });

  it("formats long breaks as a range and short ones as a single time", () => {
    expect(formatBreakTime("2026-11-10T12:50:00-07:00", "2026-11-10T15:40:00-07:00")).toBe(
      formatTimeRange("2026-11-10T12:50:00-07:00", "2026-11-10T15:40:00-07:00"),
    );
    expect(formatBreakTime("2026-11-10T16:10:00-07:00", "2026-11-10T16:40:00-07:00")).toBe(
      formatTime("2026-11-10T16:10:00-07:00"),
    );
  });

  it("titles empty notes and avoids repeating short notes as detail", () => {
    expect(breakTitle("")).toBe("Room to breathe");
    expect(breakDetail("")).toBeUndefined();
    expect(breakTitle("Coffee break")).toBe("Coffee break");
    expect(breakDetail("Coffee break")).toBeUndefined();
    expect(breakTitle("Lunch. Open time after.")).toBe("Lunch");
    expect(breakDetail("Lunch. Open time after.")).toBe("Lunch. Open time after.");
    expect(breakTitle("Open time between sessions on the schedule.")).toBe("Open time");
    expect(breakDetail("Open time between sessions on the schedule.")).toBeUndefined();
  });
});

describe("resolveTodayHeading branches", () => {
  const blocks = buildDayTimeline(sessions, plan.days["2026-11-10"]);

  it("returns off-event outside conference days", () => {
    const heading = resolveTodayHeading("2026-11-09", blocks, Date.now(), plan, sessions);
    expect(heading).toEqual({ kind: "off-event", dayKey: "2026-11-09" });
  });

  it("returns empty-day when the day has no joinable blocks", () => {
    const heading = resolveTodayHeading(
      "2026-11-10",
      [],
      Date.parse("2026-11-10T09:00:00-07:00"),
      plan,
      sessions,
    );
    expect(heading).toEqual({ kind: "empty-day", text: "No sessions on your plan for today." });
  });

  it("returns in-break when the clock is inside a planned break", () => {
    const lunch = Date.parse("2026-11-10T13:00:00-07:00");
    const heading = resolveTodayHeading("2026-11-10", blocks, lunch, plan, sessions);
    expect(heading.kind).toBe("in-break");
    if (heading.kind === "in-break") {
      expect(heading.text).toContain("3:40");
    }
  });

  it("returns next when a planned session is still ahead", () => {
    const morning = Date.parse("2026-11-10T09:00:00-07:00");
    const heading = resolveTodayHeading("2026-11-10", blocks, morning, plan, sessions);
    expect(heading).toEqual({ kind: "next", text: "Next, at 11:30 AM" });
  });

  it("returns day-done without a next session when the conference ends", () => {
    const lastBlocks = buildDayTimeline(sessions, plan.days["2026-11-12"]);
    const heading = resolveTodayHeading(
      "2026-11-12",
      lastBlocks,
      Date.parse("2026-11-12T23:00:00-07:00"),
      plan,
      sessions,
    );
    expect(heading).toEqual({ kind: "day-done", dayKey: "2026-11-12" });
  });
});
