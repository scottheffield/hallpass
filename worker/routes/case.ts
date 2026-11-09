import type { CaseResponse } from "../../shared/api";
import type { Env } from "../env";
import { generateCase } from "../case/case";
import { fixturePlan, fixtureProfile } from "../lib/fixtures";
import { json } from "../lib/http";
import { getPlan, getProfile, putCase } from "../lib/store";
import { readObject } from "./body";

export function shouldPersistCase(storedProfile: unknown, storedPlan: unknown): boolean {
  return Boolean(storedProfile && storedPlan);
}

/** Case for attending from profile and plan. Session ids always come from the plan in code. */
export async function caseForAttending(request: Request, env: Env, ctx: ExecutionContext, attendeeId: string): Promise<Response> {
  void ctx;
  await readObject(request);

  const storedProfile = await getProfile(env, attendeeId);
  const storedPlan = await getPlan(env, attendeeId);
  const profile = storedProfile ?? fixtureProfile(attendeeId);
  profile.attendee_id = attendeeId;
  const plan = storedPlan ?? fixturePlan(attendeeId);
  plan.attendee_id = attendeeId;

  const { case: generated, stub } = await generateCase(env, attendeeId, profile, plan);
  if (shouldPersistCase(storedProfile, storedPlan)) {
    await putCase(env, generated);
  }

  const response: CaseResponse = { case: generated };
  if (stub || !storedProfile || !storedPlan) response.stub = true;
  return json(response);
}
