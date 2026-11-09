import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "../../shared/types";
import type { Env } from "../env";
import * as agenda from "../lib/agenda";
import { ensureAgendaCache, getCachedSessions, resetAgendaCacheForTests } from "./agenda-cache";

const env = { ASSETS: { fetch: async () => new Response("", { status: 404 }) } } as unknown as Env;

const realSession: Session = {
  id: "9001",
  title: "Real agenda row",
  start: "2026-11-10T10:00:00-07:00",
  end: "2026-11-10T10:40:00-07:00",
  room: "Room 151",
  track: "Platform",
  speakers: ["Pat"],
  abstract: "A real session.",
  search_text: "platform",
  speaker_text: "Pat",
};

describe("ensureAgendaCache", () => {
  beforeEach(() => {
    resetAgendaCacheForTests();
    vi.restoreAllMocks();
  });

  it("caches only a real agenda load", async () => {
    const loadAgenda = vi.spyOn(agenda, "loadAgenda");
    loadAgenda.mockResolvedValueOnce({ sessions: [realSession], source: "agenda" });
    await ensureAgendaCache(env);
    loadAgenda.mockResolvedValueOnce({
      sessions: [{ ...realSession, id: "fixture-only" }],
      source: "fixture",
      fallback: "missing",
    });
    const second = await ensureAgendaCache(env);
    expect(second[0].id).toBe("9001");
    expect(getCachedSessions()[0].id).toBe("9001");
    expect(loadAgenda).toHaveBeenCalledTimes(1);
  });

  it("retries after a fixture fallback without poisoning the cache", async () => {
    const loadAgenda = vi.spyOn(agenda, "loadAgenda");
    loadAgenda.mockResolvedValueOnce({ sessions: [realSession], source: "fixture", fallback: "x" });
    const first = await ensureAgendaCache(env);
    expect(first[0].id).toBe("9001");
    loadAgenda.mockResolvedValueOnce({ sessions: [{ ...realSession, id: "agenda-2" }], source: "agenda" });
    const second = await ensureAgendaCache(env);
    expect(second[0].id).toBe("agenda-2");
    expect(loadAgenda).toHaveBeenCalledTimes(2);
    loadAgenda.mockClear();
    const third = await ensureAgendaCache(env);
    expect(third[0].id).toBe("agenda-2");
    expect(loadAgenda).not.toHaveBeenCalled();
  });
});
