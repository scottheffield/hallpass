import { describe, expect, it } from "vitest";
import type { Env } from "../env";
import { fixturePlan } from "../lib/fixtures";
import { getPlan } from "../lib/store";
import { demoLoad } from "./demo";
import { planGet } from "./plan";

function memoryEnv(): Env {
  return {
    ASSETS: { fetch: async () => new Response(null, { status: 404 }) },
    ELASTIC_INDEX_PREFIX: "hallpass-test",
    SESSIONS_INDEX: "hallpass-sessions",
    CLAUDE_MODEL: "claude-opus-5-5",
  } as unknown as Env;
}

describe("demo load route", () => {
  it("persists the fixture plan so a later plan read succeeds", async () => {
    const env = memoryEnv();
    const attendeeId = "demo_load_test";
    const seed = fixturePlan(attendeeId);

    const loadRequest = new Request("https://hallpass.local/api/demo/load", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const loadResponse = await demoLoad(loadRequest, env, {} as ExecutionContext, attendeeId);
    expect(loadResponse.status).toBe(200);
    const loadBody = (await loadResponse.json()) as { stub?: boolean; plan: { attendee_id: string } };
    expect(loadBody.stub).toBeUndefined();
    expect(loadBody.plan.attendee_id).toBe(attendeeId);

    const stored = await getPlan(env, attendeeId);
    expect(stored?.days).toEqual(seed.days);

    const getRequest = new Request("https://hallpass.local/api/plan/get", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const getResponse = await planGet(getRequest, env, {} as ExecutionContext, attendeeId);
    const getBody = (await getResponse.json()) as { plan: { days: typeof seed.days } | null };
    expect(getBody.plan?.days).toEqual(seed.days);
  });
});
