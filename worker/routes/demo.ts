import type { DemoLoadResponse } from "../../shared/api";
import type { Env } from "../env";
import { fixturePlan, fixtureProfile } from "../lib/fixtures";
import { json } from "../lib/http";
import { readObject } from "./body";

/** Stub demo load. Returns the illustrative profile and plan. Does not write to Elastic. */
export async function demoLoad(request: Request, env: Env, ctx: ExecutionContext, attendeeId: string): Promise<Response> {
  void env;
  void ctx;
  await readObject(request);
  const response: DemoLoadResponse = {
    stub: true,
    profile: fixtureProfile(attendeeId),
    plan: fixturePlan(attendeeId),
  };
  return json(response);
}
