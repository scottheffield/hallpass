import type { InsightsResponse } from "../../shared/api";
import type { Env } from "../env";
import { json } from "../lib/http";
import { computeInsights } from "../insights";

export async function insights(_request: Request, env: Env, _ctx: ExecutionContext, _attendeeId: string): Promise<Response> {
  void _attendeeId;
  const { insights: body, stub } = await computeInsights(env);
  const response: InsightsResponse = stub ? { ...body, stub: true } : body;
  return json(response);
}
