import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LeaveSessionResponse } from "../../shared/api";
import { NOW_HEADER } from "../../shared/types";
import type { Env } from "../env";
import { fixturePlan } from "../lib/fixtures";
import * as store from "../lib/store";
import { leaveSession, sessionInProgressAt } from "./leave";

function memoryEnv(): Env {
  return {
    ASSETS: { fetch: async () => new Response("", { status: 404 }) },
    ELASTIC_INDEX_PREFIX: "hallpass-test",
    SESSIONS_INDEX: "hallpass-sessions",
    CLAUDE_MODEL: "claude-opus-5-5",
  } as unknown as Env;
}

describe("sessionInProgressAt", () => {
  it("is true only between start and end", () => {
    const session = { start: "2026-11-10T11:30:00-07:00", end: "2026-11-10T12:05:00-07:00" };
    expect(sessionInProgressAt(Date.parse("2026-11-10T11:45:00-07:00"), session)).toBe(true);
    expect(sessionInProgressAt(Date.parse("2026-11-10T11:29:00-07:00"), session)).toBe(false);
    expect(sessionInProgressAt(Date.parse("2026-11-10T12:05:00-07:00"), session)).toBe(false);
  });
});

describe("leaveSession route", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("marks a planned session as left_early while in progress", async () => {
    const attendeeId = "leave-route-test";
    const basePlan = fixturePlan(attendeeId);
    vi.spyOn(store, "getPlan").mockResolvedValue(basePlan);
    vi.spyOn(store, "putPlan").mockImplementation(async (_env, row) => row);

    const request = new Request("https://hallpass.local/api/session/leave", {
      method: "POST",
      headers: {
        "X-Hallpass-Attendee": attendeeId,
        [NOW_HEADER]: "2026-11-10T11:45:00-07:00",
      },
      body: JSON.stringify({ session_id: "1246200" }),
    });

    const response = await leaveSession(request, memoryEnv(), {} as ExecutionContext, attendeeId);
    expect(response.status).toBe(200);
    const body = (await response.json()) as LeaveSessionResponse;
    const item = body.plan.days["2026-11-10"]?.items.find((row) => row.session_id === "1246200");
    expect(item?.status).toBe("left_early");
  });

  it("rejects leave when the session has not started", async () => {
    const attendeeId = "leave-too-early";
    vi.spyOn(store, "getPlan").mockResolvedValue(fixturePlan(attendeeId));

    const request = new Request("https://hallpass.local/api/session/leave", {
      method: "POST",
      headers: {
        "X-Hallpass-Attendee": attendeeId,
        [NOW_HEADER]: "2026-11-10T09:00:00-07:00",
      },
      body: JSON.stringify({ session_id: "1246200" }),
    });

    await expect(leaveSession(request, memoryEnv(), {} as ExecutionContext, attendeeId)).rejects.toMatchObject({
      status: 400,
    });
  });
});
