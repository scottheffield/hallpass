import type { ProfileResponse } from "../../shared/api";
import type { Env } from "../env";
import { fixtureProfile } from "../lib/fixtures";
import { json } from "../lib/http";
import { readObject } from "./body";

/** Stub save. Returns the illustrative profile for this attendee. */
export async function profileSave(request: Request, env: Env, ctx: ExecutionContext, attendeeId: string): Promise<Response> {
  void env;
  void ctx;
  await readObject(request);
  const body: ProfileResponse = { profile: fixtureProfile(attendeeId), stub: true };
  return json(body);
}

/** Stub read. Returns the illustrative profile until intake stores one. */
export async function profileGet(request: Request, env: Env, ctx: ExecutionContext, attendeeId: string): Promise<Response> {
  void env;
  void ctx;
  await readObject(request);
  const body: ProfileResponse = { profile: fixtureProfile(attendeeId), stub: true };
  return json(body);
}
