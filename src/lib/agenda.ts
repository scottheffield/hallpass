import sample from "../../shared/fixtures/sessions-sample.json";
import type { Session } from "../../shared/types";

export interface LoadedAgenda {
  sessions: Session[];
  source: "agenda" | "fixture";
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

async function readAgenda(): Promise<LoadedAgenda> {
  try {
    const response = await fetch("/agenda.json", { cache: "no-store" });
    if (response.ok) {
      const body: unknown = await response.json();
      const sessions = sessionsFrom(body);
      if (sessions) return { sessions, source: "agenda" };
    } else {
      await response.body?.cancel();
    }
  } catch {
    // Offline or file missing.
  }
  return { sessions: sessionsFrom(sample) ?? [], source: "fixture" };
}

/** Loads public/agenda.json, or the bundled sample. Only a successful agenda load is cached. */
export function loadAgenda(): Promise<LoadedAgenda> {
  if (cached) return Promise.resolve(cached);
  if (!inflight) {
    inflight = readAgenda().finally(() => {
      inflight = null;
    });
  }
  return inflight.then((result) => {
    if (result.source === "agenda") cached = result;
    return result;
  });
}

export function getSession(sessions: Session[], id: string): Session | undefined {
  return sessions.find((session) => session.id === id);
}

export function sessionsByDay(sessions: Session[], day: string): Session[] {
  return sessions
    .filter((session) => session.start.slice(0, 10) === day)
    .sort((a, b) => a.start.localeCompare(b.start) || a.id.localeCompare(b.id));
}

/** Join plan items to agenda rows. Unknown ids are dropped. */
export function joinPlanSessions(sessions: Session[], sessionIds: string[]): Session[] {
  return sessionIds.flatMap((id) => {
    const session = getSession(sessions, id);
    return session ? [session] : [];
  });
}
