import { describe, expect, it, vi } from "vitest";
import type { Env } from "../env";
import { fixturePlan, fixtureProfile } from "../lib/fixtures";
import * as store from "../lib/store";
import * as summary from "../summary/readout";
import { readout, shouldPersistReadout } from "./readout";

describe("shouldPersistReadout", () => {
  it("is false when profile or plan came from fixtures", () => {
    expect(shouldPersistReadout(null, fixturePlan("a"))).toBe(false);
    expect(shouldPersistReadout(fixtureProfile("a"), null)).toBe(false);
    expect(shouldPersistReadout(null, null)).toBe(false);
  });

  it("is true when both profile and plan are stored", () => {
    expect(shouldPersistReadout(fixtureProfile("a"), fixturePlan("a"))).toBe(true);
  });
});

describe("readout route", () => {
  it("does not call putReadout when profile and plan are missing", async () => {
    const putReadout = vi.spyOn(store, "putReadout").mockResolvedValue({
      attendee_id: "test-attendee",
      as_of: "2026-11-10T12:00:00-07:00",
      final: false,
      goals_hit: [],
      goals_missed: [],
      helped_sessions: [],
      gaps: [],
      followups: [],
    });
    vi.spyOn(store, "getProfile").mockResolvedValue(null);
    vi.spyOn(store, "getPlan").mockResolvedValue(null);
    vi.spyOn(store, "listCheckIns").mockResolvedValue([]);
    vi.spyOn(summary, "generateReadout").mockResolvedValue({
      stub: true,
      readout: {
        attendee_id: "test-attendee",
        as_of: "2026-11-10T12:00:00-07:00",
        final: false,
        goals_hit: [],
        goals_missed: [],
        helped_sessions: [],
        gaps: ["Summary built from your check-ins (AI unavailable)."],
        followups: ["Send your manager a short recap of what moved and what is still open."],
      },
    });

    const request = new Request("https://hallpass.local/api/readout", {
      method: "POST",
      headers: { "X-Hallpass-Attendee": "test-attendee" },
      body: "{}",
    });
    const env = {} as Env;
    const response = await readout(request, env, {} as ExecutionContext, "test-attendee");
    expect(response.status).toBe(200);
    expect(putReadout).not.toHaveBeenCalled();

    putReadout.mockRestore();
    vi.restoreAllMocks();
  });
});
