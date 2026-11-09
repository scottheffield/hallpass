import type { PlanEditResponse, PlanResponse } from "../../shared/api";
import { isPlanAction } from "../../shared/api";
import { EVENT_DAYS } from "../../shared/event";
import type { Plan } from "../../shared/types";
import type { Env } from "../env";
import { HttpError, json } from "../lib/http";
import { getProfile, getPlan, putPlan } from "../lib/store";
import { applyPlanEdit } from "../plan/edit";
import { generateDay } from "../plan";
import { gatherCandidates } from "../plan/candidates";
import { toConferenceIso } from "../plan/time";
import { readObject } from "./body";
import { now } from "../lib/clock";

function emptyPlan(attendeeId: string, at: string): Plan {
  const days: Plan["days"] = {};
  for (const day of EVENT_DAYS) days[day] = { items: [], breaks: [] };
  return { attendee_id: attendeeId, days, source: "basic", updated_at: at };
}

function requireDay(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new HttpError(400, "bad_request", "Day must be YYYY-MM-DD.");
  }
  return value;
}

export async function planGenerate(request: Request, env: Env, ctx: ExecutionContext, attendeeId: string): Promise<Response> {
  void ctx;
  const body = await readObject(request);
  const day = requireDay(body.day);

  const profile = await getProfile(env, attendeeId);
  if (!profile) throw new HttpError(400, "bad_request", "Save a profile before generating a plan.");

  const at = toConferenceIso(now(request));
  let plan = (await getPlan(env, attendeeId)) ?? emptyPlan(attendeeId, at);

  const generated = await generateDay(env, profile, day, plan);
  plan = structuredClone(plan);
  plan.days[day] = generated.day;
  plan.source = generated.source;
  plan.updated_at = at;
  await putPlan(env, plan);

  const response: PlanResponse = { plan };
  return json(response);
}

export async function planGet(request: Request, env: Env, ctx: ExecutionContext, attendeeId: string): Promise<Response> {
  void ctx;
  await readObject(request);
  const plan = await getPlan(env, attendeeId);
  const response: PlanResponse = { plan };
  return json(response);
}

export async function planEdit(request: Request, env: Env, ctx: ExecutionContext, attendeeId: string): Promise<Response> {
  void ctx;
  const body = await readObject(request);
  if (body.action !== undefined && !isPlanAction(body.action)) {
    throw new HttpError(400, "bad_request", "Action must be pin, drop, or swap.");
  }
  const day = requireDay(body.day);
  if (typeof body.session_id !== "string" || !body.session_id) {
    throw new HttpError(400, "bad_request", "Session id must be text.");
  }
  if (!isPlanAction(body.action)) throw new HttpError(400, "bad_request", "Action must be pin, drop, or swap.");

  const profile = await getProfile(env, attendeeId);
  if (!profile) throw new HttpError(400, "bad_request", "Save a profile before editing a plan.");

  const existing = await getPlan(env, attendeeId);
  if (!existing) throw new HttpError(400, "bad_request", "No plan saved yet.");

  let edited: { plan: Plan; changes: import("../../shared/types").PlanChange[] };
  try {
    const candidates = await gatherCandidates(env, profile, day, existing);
    edited = applyPlanEdit(existing, day, body.session_id, body.action, candidates);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Edit failed.";
    throw new HttpError(400, "bad_request", message);
  }

  edited.plan.updated_at = toConferenceIso(now(request));
  await putPlan(env, edited.plan);

  const response: PlanEditResponse = { plan: edited.plan, changes: edited.changes };
  return json(response);
}
