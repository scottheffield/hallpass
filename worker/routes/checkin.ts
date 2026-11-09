import type { CheckInResponse, PlanResponse } from "../../shared/api";
import type { CheckIn, MovedGoal, WorthIt } from "../../shared/types";
import type { Env } from "../env";
import { fixturePlan, fixtureProfile } from "../lib/fixtures";
import { HttpError, json } from "../lib/http";
import { replanDay } from "../plan";
import { readObject } from "./body";

const WORTH: readonly WorthIt[] = ["yes", "mixed", "no"];
const MOVED: readonly MovedGoal[] = ["yes", "a_little", "no"];

function choice<T extends string>(value: unknown, allowed: readonly T[], name: string, fallback: T): T {
  if (value === undefined) return fallback;
  if (typeof value === "string" && (allowed as readonly string[]).includes(value)) return value as T;
  throw new HttpError(400, "bad_request", `${name} is not a valid value.`);
}

/** Stub check-in. Saves nothing. `replanDay` returns the illustrative day, so the proposal is null. */
export async function checkin(request: Request, env: Env, ctx: ExecutionContext, attendeeId: string): Promise<Response> {
  void env;
  void ctx;
  const body = await readObject(request);
  if (body.session_id !== undefined && typeof body.session_id !== "string") {
    throw new HttpError(400, "bad_request", "Session id must be text.");
  }
  if (typeof body.session_id === "string" && body.session_id.length > 200) {
    throw new HttpError(400, "bad_request", "Session id is too long.");
  }
  if (body.note !== undefined && typeof body.note !== "string") throw new HttpError(400, "bad_request", "Note must be text.");
  if (typeof body.note === "string" && body.note.length > 280) {
    throw new HttpError(400, "bad_request", "Note must be at most 280 characters.");
  }

  const sessionId = typeof body.session_id === "string" && body.session_id ? body.session_id : "illustrative-incident-debugging";
  const worthIt = choice(body.worth_it, WORTH, "worth_it", "yes");
  const movedGoal = choice(body.moved_goal, MOVED, "moved_goal", "a_little");
  const checkinBody: CheckIn = {
    attendee_id: attendeeId,
    session_id: sessionId,
    at: "2026-11-10T10:40:00-07:00",
    worth_it: worthIt,
    moved_goal: movedGoal,
  };
  if (typeof body.note === "string" && body.note) checkinBody.note = body.note;

  const profile = fixtureProfile(attendeeId);
  const plan = fixturePlan(attendeeId);
  const day = "2026-11-10";
  const before = JSON.stringify(plan.days[day]);
  const revised = replanDay(profile, plan, day, checkinBody.at, {
    session_id: sessionId,
    worth_it: worthIt,
    moved_goal: movedGoal,
    note: checkinBody.note,
  });
  plan.days[day] = revised;
  const proposal = JSON.stringify(revised) === before
    ? null
    : { id: "stub-proposal", day, changes: [], days: plan.days };

  const response: CheckInResponse = { checkin: checkinBody, proposal, stub: true };
  return json(response);
}

/** Stub apply. Returns the illustrative plan either way. */
export async function applyProposal(request: Request, env: Env, ctx: ExecutionContext, attendeeId: string): Promise<Response> {
  void env;
  void ctx;
  const body = await readObject(request);
  if (body.accept !== undefined && typeof body.accept !== "boolean") {
    throw new HttpError(400, "bad_request", "accept must be true or false.");
  }
  const response: PlanResponse = { plan: fixturePlan(attendeeId), stub: true };
  return json(response);
}
