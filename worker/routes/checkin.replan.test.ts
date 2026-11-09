import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CheckInResponse } from "../../shared/api";
import type { Env } from "../env";
import { fixturePlan, fixtureProfile } from "../lib/fixtures";
import * as store from "../lib/store";
import { resetAgendaCacheForTests } from "../plan/agenda-cache";
import { checkin } from "./checkin";

function memoryEnv(): Env {
  return {
    ASSETS: { fetch: async () => new Response("", { status: 404 }) },
    ELASTIC_INDEX_PREFIX: "hallpass-test",
    SESSIONS_INDEX: "hallpass-sessions",
    CLAUDE_MODEL: "claude-opus-5-5",
  } as unknown as Env;
}

describe("check-in route proposal copy", () => {
  beforeEach(() => {
    resetAgendaCacheForTests();
    vi.restoreAllMocks();
  });

  it("passes check-in signal through the handler so drops cite attendee feedback", async () => {
    const attendeeId = "checkin-signal-route";
    vi.spyOn(store, "getPlan").mockResolvedValue(fixturePlan(attendeeId));
    vi.spyOn(store, "getProfile").mockResolvedValue(fixtureProfile(attendeeId));
    vi.spyOn(store, "putCheckIn").mockImplementation(async (_env, row) => row);
    vi.spyOn(store, "putPlan").mockImplementation(async (_env, row) => row);

    const request = new Request("https://hallpass.local/api/checkin", {
      method: "POST",
      headers: {
        "X-Hallpass-Attendee": attendeeId,
        "X-Hallpass-Now": "2026-11-10T12:05:00-07:00",
      },
      body: JSON.stringify({
        session_id: "1246200",
        worth_it: "mixed",
        moved_goal: "no",
      }),
    });

    const response = await checkin(request, memoryEnv(), {} as ExecutionContext, attendeeId);
    expect(response.status).toBe(200);
    const body = (await response.json()) as CheckInResponse;
    expect(body.proposal).not.toBeNull();
    const removed = body.proposal?.changes.find((change) => change.kind === "removed");
    expect(removed?.text).toContain("you said the last session didn't move your goal");
  });
});
