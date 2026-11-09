import type { ProfileResponse, ProfileSaveRequest } from "../../shared/api";
import type { Profile } from "../../shared/types";
import type { Env } from "../env";
import { now } from "../lib/clock";
import { json } from "../lib/http";
import { getProfile, putProfile } from "../lib/store";
import { draftFromBody } from "../intake/run";
import { conferenceNowIso } from "../intake/time";
import { readObject } from "./body";

export async function profileSave(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  attendeeId: string,
): Promise<Response> {
  void ctx;
  const body = await readObject(request);
  void (body as unknown as ProfileSaveRequest);
  const draft = draftFromBody(body);
  const saved: Profile = {
    ...draft,
    attendee_id: attendeeId,
    updated_at: conferenceNowIso(now(request)),
  };
  const profile = await putProfile(env, saved);
  const response: ProfileResponse = { profile };
  return json(response);
}

export async function profileGet(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  attendeeId: string,
): Promise<Response> {
  void ctx;
  await readObject(request);
  const profile = await getProfile(env, attendeeId);
  const response: ProfileResponse = { profile };
  return json(response);
}
