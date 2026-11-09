import type { InterviewRequest, InterviewResponse } from "../../shared/api";
import type { Env } from "../env";
import { json } from "../lib/http";
import { answersFromBody, runInterview } from "../intake/run";
import { readObject } from "./body";

export async function interview(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  attendeeId: string,
): Promise<Response> {
  void ctx;
  void attendeeId;
  const body = await readObject(request);
  void (body as unknown as InterviewRequest);
  const answers = answersFromBody(body);
  const result = await runInterview(env, answers);
  const response: InterviewResponse = {
    profile: result.profile,
    clarify: result.clarify,
    basic: result.basic,
  };
  return json(response);
}
