import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CheckInResponse } from "../../shared/api";
import { NOW_HEADER } from "../../shared/types";
import type { Env } from "../env";
import { fixturePlan, fixtureProfile } from "../lib/fixtures";
import * as store from "../lib/store";
import { checkin } from "./checkin";

function memoryEnv(): Env {
  return {
    ASSETS: { fetch: async () => new Response("", { status: 404 }) },
    ELASTIC_INDEX_PREFIX: "hallpass-test",
    SESSIONS_INDEX: "hallpass-sessions",
    CLAUDE_MODEL: "claude-opus-5-5",
  } as unknown as Env;
}

describe("check-in left_early guard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects early feedback when the plan item is still planned", async () => {
    const attendeeId = "checkin-left-early-guard";
    vi.spyOn(store, "getPlan").mockResolvedValue(fixturePlan(attendeeId));
    vi.spyOn(store, "getProfile").mockResolvedValue(fixtureProfile(attendeeId));

    const request = new Request("https://hallpass.local/api/checkin", {
      method: "POST",
      headers: {
        "X-Hallpass-Attendee": attendeeId,
        [NOW_HEADER]: "2026-11-10T11:45:00-07:00",
      },
      body: JSON.stringify({
        session_id: "1246200",
        worth_it: "mixed",
        moved_goal: "no",
        left_early: true,
      }),
    });

    await expect(checkin(request, memoryEnv(), {} as ExecutionContext, attendeeId)).rejects.toMatchObject({
      status: 400,
    });
  });

  it("saves early feedback when leave already marked the session left_early", async () => {
    const attendeeId = "checkin-left-early-ok";
    const plan = fixturePlan(attendeeId);
    const day = plan.days["2026-11-10"];
    const item = day?.items.find((row) => row.session_id === "1246200");
    if (item) item.status = "left_early";

    vi.spyOn(store, "getPlan").mockResolvedValue(plan);
    vi.spyOn(store, "getProfile").mockResolvedValue(fixtureProfile(attendeeId));
    vi.spyOn(store, "putCheckIn").mockImplementation(async (_env, row) => row);
    vi.spyOn(store, "putPlan").mockImplementation(async (_env, row) => row);

    const request = new Request("https://hallpass.local/api/checkin", {
      method: "POST",
      headers: {
        "X-Hallpass-Attendee": attendeeId,
        [NOW_HEADER]: "2026-11-10T11:45:00-07:00",
      },
      body: JSON.stringify({
        session_id: "1246200",
        worth_it: "mixed",
        moved_goal: "no",
        left_early: true,
      }),
    });

    const response = await checkin(request, memoryEnv(), {} as ExecutionContext, attendeeId);
    expect(response.status).toBe(200);
    const body = (await response.json()) as CheckInResponse;
    expect(body.checkin.left_early).toBe(true);
    const saved = day?.items.find((row) => row.session_id === "1246200");
    expect(saved?.status).toBe("left_early");
  });
});
