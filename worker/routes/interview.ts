import type { InterviewResponse } from "../../shared/api";
import type { Env } from "../env";
import { fixtureProfileDraft } from "../lib/fixtures";
import { json } from "../lib/http";
import { readObject } from "./body";

/** Stub interview. Returns the illustrative profile draft and does not call Claude. */
export async function interview(request: Request, env: Env, ctx: ExecutionContext, attendeeId: string): Promise<Response> {
  void env;
  void ctx;
  void attendeeId;
  await readObject(request);
  const body: InterviewResponse = { profile: fixtureProfileDraft(), stub: true };
  return json(body);
}
