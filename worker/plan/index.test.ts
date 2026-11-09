import { describe, expect, it } from "vitest";
import { fixturePlan, fixtureProfile } from "../lib/fixtures";
import { replanDay } from "./index";
import { ensureAgendaCache } from "./agenda-cache";
import type { Env } from "../env";

function fixtureEnv(): Env {
  return {
    ASSETS: {
      fetch: async () => new Response("missing", { status: 404 }),
    },
  } as unknown as Env;
}

describe("replanDay", () => {
  it("does not refill with sessions that start before from", async () => {
    await ensureAgendaCache(fixtureEnv());
    const profile = fixtureProfile("test-attendee");
    const plan = fixturePlan("test-attendee");
    const day = "2026-11-10";
    const from = "2026-11-10T14:00:00-07:00";
    const revised = replanDay(profile, plan, day, from, {
      session_id: "1246200",
      worth_it: "mixed",
      moved_goal: "a_little",
    });
    const fromMs = Date.parse(from);
    const { getCachedSessions } = await import("./agenda-cache");
    const byId = new Map(getCachedSessions().map((s) => [s.id, s]));
    for (const item of revised.items) {
      const session = byId.get(item.session_id);
      if (!session) continue;
      const keptEarly =
        item.pinned ||
        item.status === "done" ||
        item.status === "left_early" ||
        Date.parse(session.end) <= fromMs;
      if (!keptEarly) {
        expect(Date.parse(session.start)).toBeGreaterThanOrEqual(fromMs);
      }
    }
  });
});
