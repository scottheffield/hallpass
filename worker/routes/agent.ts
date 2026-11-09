import { agentRequestError } from "../../shared/api";
import type { AgentMessage } from "../../shared/api";
import { handleAgent } from "../agent";
import type { Env } from "../env";
import { HttpError } from "../lib/http";
import { readObject } from "./body";

function parseMessages(body: Record<string, unknown>): AgentMessage[] {
  const problem = agentRequestError(body.messages);
  if (problem) throw new HttpError(400, "bad_request", problem);
  return body.messages as AgentMessage[];
}

/** Corner agent. SSE stream; fallback sentence when Claude is not configured. */
export async function agent(request: Request, env: Env, ctx: ExecutionContext, attendeeId: string): Promise<Response> {
  void ctx;
  const body = await readObject(request);
  const messages = parseMessages(body);
  if (messages.length === 0) throw new HttpError(400, "bad_request", "Send at least one message.");
  return handleAgent(env, request, attendeeId, messages);
}
