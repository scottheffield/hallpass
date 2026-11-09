import { describe, expect, it } from "vitest";
import type { Env } from "../env";
import { searchSessions } from "./search";

function fixtureEnv(): Env {
  return {
    ASSETS: {
      fetch: async () => new Response("missing", { status: 404 }),
    },
  } as unknown as Env;
}

describe("searchSessions", () => {
  it("ranks keyword matches on the agenda-backed sample", async () => {
    const env = fixtureEnv();
    const result = await searchSessions(env, {
      text: "kubernetes incident",
      field: "search_text",
      day: "2026-11-10",
      size: 5,
    });
    expect(result.source).toBe("fallback");
    expect(result.hits.length).toBeGreaterThan(0);
    expect(result.hits.some((hit) => hit.session.id === "1250770" || hit.session.id === "1244963")).toBe(true);
    expect(result.hits.every((hit) => hit.source === "fallback")).toBe(true);

    const thursday = await searchSessions(env, {
      text: "kubernetes incident",
      field: "search_text",
      day: "2026-11-12",
    });
    expect(thursday.hits.some((hit) => hit.session.id === "1250770")).toBe(false);
  });
});
