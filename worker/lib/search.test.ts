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
  it("ranks keyword matches on the illustrative agenda", async () => {
    const env = fixtureEnv();
    const result = await searchSessions(env, {
      text: "kubernetes incident",
      field: "search_text",
      day: "2026-11-10",
      size: 5,
    });
    expect(result.source).toBe("fallback");
    expect(result.fallback).toMatch(/illustrative/);
    expect(result.hits[0]?.session.id).toBe("illustrative-incident-debugging");
    expect(result.hits.every((hit) => hit.source === "fallback")).toBe(true);

    const thursday = await searchSessions(env, {
      text: "kubernetes incident",
      field: "search_text",
      day: "2026-11-12",
    });
    expect(thursday.hits.some((hit) => hit.session.id === "illustrative-incident-debugging")).toBe(false);
  });
});
