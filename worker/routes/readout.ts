import type { ReadoutResponse } from "../../shared/api";
import type { Env } from "../env";
import { fixturePlan, fixtureProfile } from "../lib/fixtures";
import { json } from "../lib/http";
import { getPlan, getProfile, listCheckIns, putReadout } from "../lib/store";
import { generateReadout } from "../summary/readout";
import { now } from "../lib/clock";
import { readObject } from "./body";

export function shouldPersistReadout(storedProfile: unknown, storedPlan: unknown): boolean {
  return Boolean(storedProfile && storedPlan);
}

/** Builds a readout from stored profile, plan and check-ins. Saves only when both came from the store. */
export async function readout(request: Request, env: Env, ctx: ExecutionContext, attendeeId: string): Promise<Response> {
  void ctx;
  await readObject(request);

  const storedProfile = await getProfile(env, attendeeId);
  const storedPlan = await getPlan(env, attendeeId);
  const profile = storedProfile ?? fixtureProfile(attendeeId);
  profile.attendee_id = attendeeId;
  const plan = storedPlan ?? fixturePlan(attendeeId);
  plan.attendee_id = attendeeId;
  const checkins = await listCheckIns(env, attendeeId);

  const { readout: generated, stub } = await generateReadout(env, attendeeId, profile, plan, checkins, now(request));
  if (shouldPersistReadout(storedProfile, storedPlan)) {
    await putReadout(env, generated);
  }

  const response: ReadoutResponse = { readout: generated };
  if (stub) response.stub = true;
  return json(response);
}
