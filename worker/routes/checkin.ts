import type { CheckInResponse, PlanResponse } from "../../shared/api";
import type { CheckIn, MovedGoal, Plan, PlanProposal, WorthIt } from "../../shared/types";
import { adjustDayAfterCheckin } from "../checkin/replan";
import { diffPlanDay } from "../checkin/diff";
import { conferenceIsoFromDate } from "../checkin/time";
import type { Env } from "../env";
import { getSession } from "../lib/agenda";
import { now, parseOffsetDateTime } from "../lib/clock";
import { fixturePlan, fixtureProfile } from "../lib/fixtures";
import { HttpError, json } from "../lib/http";
import { getPlan, getProfile, putCheckIn, putPlan } from "../lib/store";
import { replanDay } from "../plan";
import { readObject } from "./body";

const WORTH: readonly WorthIt[] = ["yes", "mixed", "no"];
const MOVED: readonly MovedGoal[] = ["yes", "a_little", "no"];

function requiredChoice<T extends string>(value: unknown, allowed: readonly T[], name: string): T {
  if (typeof value !== "string" || !(allowed as readonly string[]).includes(value)) {
    throw new HttpError(400, "bad_request", `${name} is required and must be a valid value.`);
  }
  return value as T;
}

function markSessionDone(plan: Plan, day: string, sessionId: string): Plan {
  const copy = structuredClone(plan);
  const dayPlan = copy.days[day];
  if (!dayPlan) return copy;
  for (const item of dayPlan.items) {
    if (item.session_id === sessionId) item.status = "done";
  }
  copy.updated_at = conferenceIsoFromDate(new Date());
  return copy;
}

export function resolveCheckInAt(request: Request, body: Record<string, unknown>): string {
  const serverNow = now(request);
  const defaultAt = conferenceIsoFromDate(serverNow);
  if (body.at === undefined) return defaultAt;
  if (typeof body.at !== "string") return defaultAt;
  const trimmed = body.at.trim();
  const parsed = parseOffsetDateTime(trimmed);
  if (!parsed) return defaultAt;
  if (parsed.getTime() > serverNow.getTime()) return defaultAt;
  return trimmed;
}

async function resolveDay(env: Env, plan: Plan, sessionId: string): Promise<string | null> {
  for (const day of Object.keys(plan.days)) {
    if (plan.days[day]?.items.some((item) => item.session_id === sessionId)) return day;
  }
  const session = await getSession(env, sessionId);
  if (session) return session.start.slice(0, 10);
  return null;
}

/** Saves check-in, marks the session done, proposes a replan (not auto-applied). */
export async function checkin(request: Request, env: Env, ctx: ExecutionContext, attendeeId: string): Promise<Response> {
  void ctx;
  const body = await readObject(request);
  if (typeof body.session_id !== "string" || !body.session_id.trim()) {
    throw new HttpError(400, "bad_request", "Session id is required.");
  }
  if (body.session_id.length > 200) throw new HttpError(400, "bad_request", "Session id is too long.");
  if (body.note !== undefined && typeof body.note !== "string") throw new HttpError(400, "bad_request", "Note must be text.");
  if (typeof body.note === "string" && body.note.length > 280) {
    throw new HttpError(400, "bad_request", "Note must be at most 280 characters.");
  }

  const sessionId = body.session_id.trim();
  const worthIt = requiredChoice(body.worth_it, WORTH, "worth_it");
  const movedGoal = requiredChoice(body.moved_goal, MOVED, "moved_goal");

  const at = resolveCheckInAt(request, body);
  const checkinBody: CheckIn = {
    attendee_id: attendeeId,
    session_id: sessionId,
    at,
    worth_it: worthIt,
    moved_goal: movedGoal,
  };
  if (typeof body.note === "string" && body.note.trim()) checkinBody.note = body.note.trim();

  let plan = (await getPlan(env, attendeeId)) ?? fixturePlan(attendeeId);
  plan.attendee_id = attendeeId;
  const profile = (await getProfile(env, attendeeId)) ?? fixtureProfile(attendeeId);

  const day = await resolveDay(env, plan, sessionId);
  if (!day || !plan.days[day]) {
    await putCheckIn(env, checkinBody);
    const response: CheckInResponse = { checkin: checkinBody, proposal: null };
    return json(response);
  }

  const signal = {
    session_id: sessionId,
    worth_it: worthIt,
    moved_goal: movedGoal,
    note: checkinBody.note,
  };

  const withDone = markSessionDone(plan, day, sessionId);
  const beforeDay = structuredClone(withDone.days[day]);

  let proposal: PlanProposal | null = null;
  try {
    void replanDay(profile, withDone, day, at, signal);
    const revised = adjustDayAfterCheckin(profile, beforeDay, at, signal);
    const changes = diffPlanDay(beforeDay, revised, { signal });
    if (changes.length > 0) {
      proposal = {
        id: crypto.randomUUID(),
        day,
        changes,
        days: { ...withDone.days, [day]: revised },
      };
    }
  } catch (err) {
    console.error("checkin_replan", { name: err instanceof Error ? err.name : "unknown" });
  }

  withDone.pending = proposal ?? undefined;
  if (!proposal) delete withDone.pending;

  await putCheckIn(env, checkinBody);
  await putPlan(env, withDone);

  const response: CheckInResponse = { checkin: checkinBody, proposal };
  return json(response);
}

/** Applies or discards `plan.pending` from the last check-in proposal. */
export async function applyProposal(request: Request, env: Env, ctx: ExecutionContext, attendeeId: string): Promise<Response> {
  void ctx;
  const body = await readObject(request);
  if (typeof body.proposal_id !== "string" || !body.proposal_id.trim()) {
    throw new HttpError(400, "bad_request", "proposal_id is required.");
  }
  if (typeof body.accept !== "boolean") {
    throw new HttpError(400, "bad_request", "accept must be true or false.");
  }

  const plan = await getPlan(env, attendeeId);
  if (!plan) throw new HttpError(400, "bad_request", "No plan saved yet.");

  const pending = plan.pending;
  if (!pending || pending.id !== body.proposal_id.trim()) {
    throw new HttpError(400, "bad_request", "No matching proposal is waiting.");
  }

  const next = structuredClone(plan);
  if (body.accept) {
    next.days = pending.days;
  }
  delete next.pending;
  next.updated_at = conferenceIsoFromDate(now(request));
  await putPlan(env, next);

  const response: PlanResponse = { plan: next };
  return json(response);
}
