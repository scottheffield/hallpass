import { describe, expect, it } from "vitest";
import demoPlan from "../../../shared/fixtures/demo-plan.json";
import sample from "../../../shared/fixtures/sessions-sample.json";
import type { Plan, Session } from "../../../shared/types";
import { findSessionInProgress, sessionBlockInProgress } from "./inProgress";
import { buildDayTimeline, nextPlannedSession } from "./timeline";

const sessions = sample.sessions as Session[];
const plan = demoPlan as Plan;

describe("findSessionInProgress", () => {
  it("finds a planned session during its scheduled window", () => {
    const inBlock = findSessionInProgress(new Date("2026-11-10T11:45:00-07:00"), plan, sessions);
    expect(inBlock?.session.id).toBe("1246200");
  });

  it("returns null before the session starts", () => {
    expect(findSessionInProgress(new Date("2026-11-10T11:00:00-07:00"), plan, sessions)).toBeNull();
  });

  it("returns null after the session ends", () => {
    expect(findSessionInProgress(new Date("2026-11-10T12:10:00-07:00"), plan, sessions)).toBeNull();
  });
});

describe("nextPlannedSession in-progress heading", () => {
  it("uses On your plan now while the clock is inside the block", () => {
    const blocks = buildDayTimeline(sessions, plan.days["2026-11-10"]);
    const during = nextPlannedSession(blocks, Date.parse("2026-11-10T11:45:00-07:00"));
    expect(during?.heading).toBe("On your plan now");
    expect(sessionBlockInProgress(during!.block, Date.parse("2026-11-10T11:45:00-07:00"))).toBe(true);
  });
});
