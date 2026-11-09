import { describe, expect, it } from "vitest";
import type { CheckIn } from "../../shared/types";
import type { Env } from "../env";
import { fixtureProfile } from "./fixtures";
import { getProfile, listCheckIns, putCheckIn, putProfile } from "./store";

function memoryEnv(): Env {
  return {
    ASSETS: { fetch: async () => new Response(null, { status: 404 }) },
    ELASTIC_INDEX_PREFIX: "hallpass-test",
    SESSIONS_INDEX: "hallpass-sessions",
    CLAUDE_MODEL: "claude-opus-5-5",
  } as unknown as Env;
}

describe("store memory fallback", () => {
  it("saves a profile and overwrites a check-in with the same id", async () => {
    const env = memoryEnv();
    const attendeeId = "attendee_store_test";
    expect(await getProfile(env, attendeeId)).toBeNull();

    const profile = fixtureProfile(attendeeId);
    await putProfile(env, profile);
    expect((await getProfile(env, attendeeId))?.goals).toEqual(profile.goals);

    const checkin: CheckIn = {
      attendee_id: attendeeId,
      session_id: "1246200",
      at: "2026-11-10T10:40:00-07:00",
      worth_it: "yes",
      moved_goal: "a_little",
    };
    await putCheckIn(env, checkin);
    await putCheckIn(env, { ...checkin, worth_it: "no" });
    const rows = await listCheckIns(env, attendeeId);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.worth_it).toBe("no");
    expect(await listCheckIns(env, "attendee_someone_else")).toEqual([]);
  });
});
