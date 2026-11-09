import type { Session } from "../../shared/types";
import sample from "../../shared/fixtures/sessions-sample.json";
import type { Env } from "../env";

export interface LoadedAgenda {
  sessions: Session[];
  /** `agenda` is public/agenda.json. `fixture` is the illustrative sample. */
  source: "agenda" | "fixture";
  /** Set when the real agenda file is not available. Safe to show. */
  fallback?: string;
}

let cached: LoadedAgenda | null = null;
let inflight: Promise<LoadedAgenda> | null = null;

function sessionsFrom(value: unknown): Session[] | null {
  if (!value || typeof value !== "object") return null;
  const sessions = (value as { sessions?: unknown }).sessions;
  if (!Array.isArray(sessions) || sessions.length === 0) return null;
  const parsed: Session[] = [];
  for (const item of sessions) {
    if (!item || typeof item !== "object") return null;
    const session = item as Session;
    if (typeof session.id !== "string" || typeof session.start !== "string" || typeof session.end !== "string") {
      return null;
    }
    parsed.push(session);
  }
  return parsed;
}

function fixtureAgenda(): LoadedAgenda {
  const sessions = sessionsFrom(sample);
  return {
    sessions: sessions ?? [],
    source: "fixture",
    fallback: "Illustrative agenda. public/agenda.json is not available.",
  };
}

async function readAgenda(env: Env): Promise<LoadedAgenda> {
  try {
    const response = await env.ASSETS.fetch(new Request("https://hallpass.local/agenda.json"));
    if (response.ok) {
      const body: unknown = await response.json().catch(() => null);
      const sessions = sessionsFrom(body);
      if (sessions) return { sessions, source: "agenda" };
    } else {
      await response.body?.cancel();
    }
  } catch (err) {
    console.error("agenda_load", { name: err instanceof Error ? err.name : "unknown" });
  }
  return fixtureAgenda();
}

/** Loads public/agenda.json through the asset binding, or the fixture fallback. Only a successful agenda load is cached per isolate. */
export function loadAgenda(env: Env): Promise<LoadedAgenda> {
  if (cached) return Promise.resolve(cached);
  if (!inflight) {
    inflight = readAgenda(env).finally(() => {
      inflight = null;
    });
  }
  return inflight.then((result) => {
    if (result.source === "agenda") cached = result;
    return result;
  });
}

export async function getSession(env: Env, id: string): Promise<Session | null> {
  const agenda = await loadAgenda(env);
  return agenda.sessions.find((session) => session.id === id) ?? null;
}

/** Sessions whose start date is `day` (`YYYY-MM-DD` in the conference offset). */
export async function sessionsByDay(env: Env, day: string): Promise<Session[]> {
  const agenda = await loadAgenda(env);
  return agenda.sessions.filter((session) => session.start.slice(0, 10) === day);
}

/**
 * True when the two time ranges overlap. Touching endpoints do not overlap.
 * Unparseable times do not overlap; plan validation rejects those separately.
 * `all_access` entries are filtered by the plan, not here.
 */
export function overlaps(a: { start: string; end: string }, b: { start: string; end: string }): boolean {
  const aStart = Date.parse(a.start);
  const aEnd = Date.parse(a.end);
  const bStart = Date.parse(b.start);
  const bEnd = Date.parse(b.end);
  if (![aStart, aEnd, bStart, bEnd].every(Number.isFinite)) return false;
  return aStart < bEnd && bStart < aEnd;
}
