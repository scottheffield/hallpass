import type { LeaveSessionResponse } from "../../shared/api";
import type { Plan, Session } from "../../shared/types";
import { conferenceIsoFromDate } from "../checkin/time";
import type { Env } from "../env";
import { getSession } from "../lib/agenda";
import { now } from "../lib/clock";
import { fixturePlan } from "../lib/fixtures";
import { HttpError, json } from "../lib/http";
import { getPlan, putPlan } from "../lib/store";
import { readObject } from "./body";

/** True when the demo or wall clock is within the session window. */
export function sessionInProgressAt(nowMs: number, session: Pick<Session, "start" | "end">): boolean {
  const startMs = Date.parse(session.start);
  const endMs = Date.parse(session.end);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return false;
  return startMs <= nowMs && nowMs < endMs;
}

function markSessionLeftEarly(plan: Plan, day: string, sessionId: string): Plan {
  const copy = structuredClone(plan);
  const dayPlan = copy.days[day];
  if (!dayPlan) return copy;
  for (const item of dayPlan.items) {
    if (item.session_id === sessionId) item.status = "left_early";
  }
  return copy;
}

async function resolveDay(plan: Plan, sessionId: string, env: Env): Promise<string | null> {
  for (const day of Object.keys(plan.days)) {
    if (plan.days[day]?.items.some((item) => item.session_id === sessionId)) return day;
  }
  const session = await getSession(env, sessionId);
  if (session) return session.start.slice(0, 10);
  return null;
}

/** Records an early departure while the session is in progress by the conference clock. */
export async function leaveSession(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  attendeeId: string,
): Promise<Response> {
  void ctx;
  const body = await readObject(request);
  if (typeof body.session_id !== "string" || !body.session_id.trim()) {
    throw new HttpError(400, "bad_request", "Session id is required.");
  }
  if (body.session_id.length > 200) throw new HttpError(400, "bad_request", "Session id is too long.");

  const sessionId = body.session_id.trim();
  const serverNow = now(request);
  const at = conferenceIsoFromDate(serverNow);
  const nowMs = serverNow.getTime();

  let plan = (await getPlan(env, attendeeId)) ?? fixturePlan(attendeeId);
  plan.attendee_id = attendeeId;

  const day = await resolveDay(plan, sessionId, env);
  if (!day || !plan.days[day]) {
    throw new HttpError(400, "bad_request", "That session is not on your plan.");
  }

  const item = plan.days[day].items.find((row) => row.session_id === sessionId);
  if (!item) throw new HttpError(400, "bad_request", "That session is not on your plan.");
  if (item.status !== "planned") {
    throw new HttpError(400, "bad_request", "That session is no longer in progress on your plan.");
  }

  const session = await getSession(env, sessionId);
  if (!session) throw new HttpError(400, "bad_request", "Unknown session.");
  if (!sessionInProgressAt(nowMs, session)) {
    throw new HttpError(400, "bad_request", "That session is not in progress right now.");
  }

  const updated = markSessionLeftEarly(plan, day, sessionId);
  updated.updated_at = at;
  await putPlan(env, updated);

  const response: LeaveSessionResponse = { plan: updated };
  return json(response);
}
