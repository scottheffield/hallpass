import type { CaseForAttending, CheckIn, Plan, Profile, Readout } from "../../shared/types";
import type { Env } from "../env";
import { elastic, getDoc, indexName, putDoc } from "./elastic";
import { HttpError } from "./http";

/**
 * In-memory fallback for local dev when Elastic is not configured.
 * The map lives on this isolate. A new isolate starts empty, and other isolates never see it.
 * Do not write the shared sessions index from here. Writable indexes use ELASTIC_INDEX_PREFIX.
 */
const memory = {
  profiles: new Map<string, Profile>(),
  plans: new Map<string, Plan>(),
  checkins: new Map<string, CheckIn>(),
  readouts: new Map<string, Readout>(),
  cases: new Map<string, CaseForAttending>(),
};

interface EsHit<T> {
  _source?: T;
}

interface EsSearch<T> {
  hits?: { hits?: EsHit<T>[] };
}

function elasticOn(env: Env): boolean {
  return Boolean(env.ELASTIC_URL && env.ELASTIC_API_KEY);
}

function checkInId(checkin: CheckIn): string {
  return `${checkin.attendee_id}:${checkin.session_id}`;
}

async function fromElastic<T>(op: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    if (err instanceof HttpError) throw err;
    console.error("store_error", { op, name: err instanceof Error ? err.name : "unknown" });
    throw new HttpError(502, "upstream", "Elastic request failed");
  }
}

export async function getProfile(env: Env, attendeeId: string): Promise<Profile | null> {
  if (!elasticOn(env)) return memory.profiles.get(attendeeId) ?? null;
  const doc = await fromElastic("getProfile", () => getDoc<Profile>(env, indexName(env, "profiles"), attendeeId));
  return doc.found ? (doc._source ?? null) : null;
}

export async function putProfile(env: Env, profile: Profile): Promise<Profile> {
  const copy = structuredClone(profile);
  if (!copy.attendee_id) throw new HttpError(400, "bad_request", "Profile needs an attendee id.");
  if (!elasticOn(env)) {
    memory.profiles.set(copy.attendee_id, copy);
    return copy;
  }
  await fromElastic("putProfile", () => putDoc(env, indexName(env, "profiles"), copy.attendee_id, copy));
  return copy;
}

export async function getPlan(env: Env, attendeeId: string): Promise<Plan | null> {
  if (!elasticOn(env)) return memory.plans.get(attendeeId) ?? null;
  const doc = await fromElastic("getPlan", () => getDoc<Plan>(env, indexName(env, "plans"), attendeeId));
  return doc.found ? (doc._source ?? null) : null;
}

export async function putPlan(env: Env, plan: Plan): Promise<Plan> {
  const copy = structuredClone(plan);
  if (!copy.attendee_id) throw new HttpError(400, "bad_request", "Plan needs an attendee id.");
  if (!elasticOn(env)) {
    memory.plans.set(copy.attendee_id, copy);
    return copy;
  }
  await fromElastic("putPlan", () => putDoc(env, indexName(env, "plans"), copy.attendee_id, copy));
  return copy;
}

export async function putCheckIn(env: Env, checkin: CheckIn): Promise<CheckIn> {
  const copy = structuredClone(checkin);
  if (!copy.attendee_id || !copy.session_id) {
    throw new HttpError(400, "bad_request", "Check-in needs an attendee id and a session id.");
  }
  const id = checkInId(copy);
  if (!elasticOn(env)) {
    memory.checkins.set(id, copy);
    return copy;
  }
  await fromElastic("putCheckIn", () => putDoc(env, indexName(env, "checkins"), id, copy));
  return copy;
}

export async function listCheckIns(env: Env, attendeeId: string): Promise<CheckIn[]> {
  if (!elasticOn(env)) {
    return [...memory.checkins.values()]
      .filter((checkin) => checkin.attendee_id === attendeeId)
      .sort((a, b) => a.at.localeCompare(b.at));
  }
  const result = await fromElastic("listCheckIns", () =>
    elastic<EsSearch<CheckIn>>(env, "POST", `/${indexName(env, "checkins")}/_search`, {
      size: 200,
      query: { term: { attendee_id: attendeeId } },
    }),
  );
  return (result.hits?.hits ?? []).flatMap((hit) => (hit._source ? [hit._source] : []));
}

export async function putReadout(env: Env, readout: Readout): Promise<Readout> {
  const copy = structuredClone(readout);
  if (!copy.attendee_id) throw new HttpError(400, "bad_request", "Readout needs an attendee id.");
  if (!elasticOn(env)) {
    memory.readouts.set(copy.attendee_id, copy);
    return copy;
  }
  await fromElastic("putReadout", () => putDoc(env, indexName(env, "readouts"), copy.attendee_id, copy));
  return copy;
}

export async function putCase(env: Env, item: CaseForAttending): Promise<CaseForAttending> {
  const copy = structuredClone(item);
  if (!copy.attendee_id) throw new HttpError(400, "bad_request", "Case needs an attendee id.");
  if (!elasticOn(env)) {
    memory.cases.set(copy.attendee_id, copy);
    return copy;
  }
  await fromElastic("putCase", () => putDoc(env, indexName(env, "cases"), copy.attendee_id, copy));
  return copy;
}
