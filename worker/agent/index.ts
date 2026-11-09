import type { AgentMessage } from "../../shared/api";
import type { Session } from "../../shared/types";
import type { Env } from "../env";
import { loadAgenda } from "../lib/agenda";
import { now } from "../lib/clock";
import { fixturePlan, fixtureProfile } from "../lib/fixtures";
import { getPlan, getProfile } from "../lib/store";
import { buildAgentContext } from "./context";
import { loadRooms } from "./rooms";
import { agentSseResponse } from "./stream";

async function sessionsById(env: Env): Promise<Map<string, Session>> {
  const agenda = await loadAgenda(env);
  const map = new Map<string, Session>();
  for (const session of agenda.sessions) map.set(session.id, session);
  return map;
}

export async function handleAgent(
  env: Env,
  request: Request,
  attendeeId: string,
  messages: AgentMessage[],
): Promise<Response> {
  const [profile, plan, sessions, rooms] = await Promise.all([
    getProfile(env, attendeeId).then((row) => row ?? fixtureProfile(attendeeId)),
    getPlan(env, attendeeId).then((row) => row ?? fixturePlan(attendeeId)),
    sessionsById(env),
    loadRooms(env),
  ]);

  const ctx = buildAgentContext(now(request), profile, plan, sessions, rooms);
  return agentSseResponse(env, ctx, messages, rooms);
}
