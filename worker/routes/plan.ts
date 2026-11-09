import type { PlanEditResponse, PlanResponse } from "../../shared/api";
import { isPlanAction } from "../../shared/api";
import type { Env } from "../env";
import { fixturePlan, fixtureProfile } from "../lib/fixtures";
import { HttpError, json } from "../lib/http";
import { generateDay } from "../plan";
import { readObject } from "./body";

/** Stub generate. Returns the illustrative plan. `generateDay` is the Plan slice's seam. */
export async function planGenerate(request: Request, env: Env, ctx: ExecutionContext, attendeeId: string): Promise<Response> {
  void env;
  void ctx;
  const body = await readObject(request);
  const plan = fixturePlan(attendeeId);
  if (typeof body.day === "string") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.day)) throw new HttpError(400, "bad_request", "Day must be YYYY-MM-DD.");
    const day = generateDay(fixtureProfile(attendeeId), body.day);
    if (plan.days[body.day]) plan.days[body.day] = day;
  }
  const response: PlanResponse = { plan, stub: true };
  return json(response);
}

export async function planGet(request: Request, env: Env, ctx: ExecutionContext, attendeeId: string): Promise<Response> {
  void env;
  void ctx;
  await readObject(request);
  const response: PlanResponse = { plan: fixturePlan(attendeeId), stub: true };
  return json(response);
}

/** Stub edit. The illustrative plan is returned unchanged. */
export async function planEdit(request: Request, env: Env, ctx: ExecutionContext, attendeeId: string): Promise<Response> {
  void env;
  void ctx;
  const body = await readObject(request);
  if (body.action !== undefined && !isPlanAction(body.action)) {
    throw new HttpError(400, "bad_request", "Action must be pin, drop, or swap.");
  }
  if (body.day !== undefined && typeof body.day !== "string") throw new HttpError(400, "bad_request", "Day must be text.");
  if (body.session_id !== undefined && typeof body.session_id !== "string") {
    throw new HttpError(400, "bad_request", "Session id must be text.");
  }
  const response: PlanEditResponse = { plan: fixturePlan(attendeeId), changes: [], stub: true };
  return json(response);
}
