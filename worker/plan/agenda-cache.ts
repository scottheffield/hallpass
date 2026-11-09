import sample from "../../shared/fixtures/sessions-sample.json";
import type { Session } from "../../shared/types";
import type { Env } from "../env";
import { loadAgenda } from "../lib/agenda";

let cached: Session[] | null = null;

function sampleSessions(): Session[] {
  const body = sample as { sessions?: Session[] };
  return Array.isArray(body.sessions) ? body.sessions : [];
}

/** Sessions available for sync replan before any async route warms the cache. */
export function getCachedSessions(): Session[] {
  return cached ?? sampleSessions();
}

export async function ensureAgendaCache(env: Env): Promise<Session[]> {
  if (cached) return cached;
  const agenda = await loadAgenda(env);
  cached = agenda.sessions;
  return cached;
}

export function sessionById(id: string): Session | undefined {
  return getCachedSessions().find((session) => session.id === id);
}
