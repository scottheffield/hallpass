import { agentRequestError } from "../../shared/api";
import type { Env } from "../env";
import { HttpError } from "../lib/http";
import { readObject } from "./body";

/** Stub corner agent. One SSE event, no model call. */
export async function agent(request: Request, env: Env, ctx: ExecutionContext, attendeeId: string): Promise<Response> {
  void env;
  void ctx;
  void attendeeId;
  const body = await readObject(request);
  const problem = agentRequestError(body.messages);
  if (problem) throw new HttpError(400, "bad_request", problem);
  const payload = JSON.stringify({
    stub: true,
    text: "Next: Debugging a Kubernetes incident, 251 A-C at 10:00.",
  });
  return new Response(`data: ${payload}\n\n`, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
