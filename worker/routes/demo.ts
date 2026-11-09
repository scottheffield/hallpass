import type { DemoLoadResponse } from "../../shared/api";
import type { Env } from "../env";
import { fixturePlan, fixtureProfile } from "../lib/fixtures";
import { json } from "../lib/http";
import { putPlan, putProfile } from "../lib/store";
import { conferenceNowIso } from "../intake/time";
import { toConferenceIso } from "../plan/time";
import { now } from "../lib/clock";
import { readObject } from "./body";

/** Loads demo profile and plan into storage for the current attendee. */
export async function demoLoad(request: Request, env: Env, ctx: ExecutionContext, attendeeId: string): Promise<Response> {
  void ctx;
  await readObject(request);
  const at = now(request);
  const profile = structuredClone(fixtureProfile(attendeeId));
  profile.updated_at = conferenceNowIso(at);
  const plan = structuredClone(fixturePlan(attendeeId));
  plan.updated_at = toConferenceIso(at);

  await putProfile(env, profile);
  await putPlan(env, plan);

  const response: DemoLoadResponse = { profile, plan };
  return json(response);
}
