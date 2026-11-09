import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../env";
import { HttpError } from "./http";

vi.mock("./elastic", () => ({
  elastic: vi.fn(),
}));

import { elastic } from "./elastic";
import { buildElasticSearchBody, searchSessions } from "./search";

const mockedElastic = vi.mocked(elastic);

function fixtureEnv(): Env {
  return {
    ASSETS: {
      fetch: async () => new Response("missing", { status: 404 }),
    },
  } as unknown as Env;
}

function elasticEnv(): Env {
  return {
    ...fixtureEnv(),
    ELASTIC_URL: "https://elastic.example",
    ELASTIC_API_KEY: "test-key",
    SESSIONS_INDEX: "hallpass-sessions",
    ELASTIC_INDEX_PREFIX: "hallpass-test",
  };
}

describe("buildElasticSearchBody", () => {
  it("builds a semantic match on search_text", () => {
    expect(buildElasticSearchBody({ text: "kubernetes incidents", field: "search_text", size: 25 })).toEqual({
      size: 25,
      query: {
        match: {
          search_text: { query: "kubernetes incidents" },
        },
      },
    });
  });

  it("filters start to the conference day in Mountain Time", () => {
    expect(buildElasticSearchBody({ text: "platform", field: "speaker_text", day: "2026-11-10", size: 20 })).toEqual({
      size: 20,
      query: {
        bool: {
          must: [
            {
              match: {
                speaker_text: { query: "platform" },
              },
            },
          ],
          filter: [
            {
              range: {
                start: {
                  gte: "2026-11-10T00:00:00-07:00",
                  lt: "2026-11-11T00:00:00-07:00",
                },
              },
            },
          ],
        },
      },
    });
  });
});

describe("searchSessions", () => {
  beforeEach(() => {
    mockedElastic.mockReset();
  });

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

  it("maps Elastic hits to agenda sessions and drops unknown ids", async () => {
    mockedElastic.mockResolvedValue({
      hits: {
        hits: [
          { _id: "1246200", _score: 14.2 },
          { _id: "not-in-agenda", _score: 7 },
        ],
      },
    });

    const result = await searchSessions(elasticEnv(), {
      text: "platform AI questions",
      field: "search_text",
      day: "2026-11-10",
      size: 10,
    });

    expect(mockedElastic).toHaveBeenCalledWith(
      expect.objectContaining({ ELASTIC_URL: "https://elastic.example" }),
      "POST",
      "/hallpass-sessions/_search",
      buildElasticSearchBody({
        text: "platform AI questions",
        field: "search_text",
        day: "2026-11-10",
        size: 10,
      }),
      { timeoutMs: 2500 },
    );
    expect(result.source).toBe("elastic");
    expect(result.hits).toHaveLength(1);
    expect(result.hits[0]?.session.id).toBe("1246200");
    expect(result.hits[0]?.score).toBe(5);
    expect(result.hits[0]?.source).toBe("elastic");
  });

  it("normalises Elastic scores into 0–5 relative to the top hit", async () => {
    mockedElastic.mockResolvedValue({
      hits: {
        hits: [
          { _id: "1246200", _score: 20 },
          { _id: "1233585", _score: 10 },
        ],
      },
    });

    const result = await searchSessions(elasticEnv(), {
      text: "agent platform",
      field: "search_text",
      day: "2026-11-10",
      size: 10,
    });

    expect(result.source).toBe("elastic");
    expect(result.hits.map((hit) => hit.score)).toEqual([5, 2.5]);
  });

  it("falls back to keyword results when Elastic errors", async () => {
    mockedElastic.mockRejectedValue(new HttpError(502, "upstream", "Elastic returned 502"));

    const result = await searchSessions(elasticEnv(), {
      text: "kubernetes incident",
      field: "search_text",
      day: "2026-11-10",
      size: 5,
    });

    expect(result.source).toBe("fallback");
    expect(result.fallback).toBe("Keyword match on the bundled agenda sample because Elastic search failed.");
    expect(result.hits.length).toBeGreaterThan(0);
    expect(result.hits.every((hit) => hit.source === "fallback")).toBe(true);
  });

  it("falls back to keyword results when Elastic times out", async () => {
    mockedElastic.mockRejectedValue(new HttpError(504, "upstream", "Elastic request failed"));

    const result = await searchSessions(elasticEnv(), {
      text: "kubernetes incident",
      field: "search_text",
      size: 5,
    });

    expect(result.source).toBe("fallback");
    expect(result.fallback).toBe("Keyword match on the bundled agenda sample because Elastic search timed out.");
    expect(result.hits.some((hit) => hit.session.id === "1250770" || hit.session.id === "1244963")).toBe(true);
  });

  it("falls back when Elastic returns no hits", async () => {
    mockedElastic.mockResolvedValue({ hits: { hits: [] } });

    const result = await searchSessions(elasticEnv(), {
      text: "kubernetes incident",
      field: "search_text",
      day: "2026-11-10",
      size: 5,
    });

    expect(result.source).toBe("fallback");
    expect(result.fallback).toBe("Keyword match on the bundled agenda sample because Elastic search returned no hits.");
    expect(result.hits.length).toBeGreaterThan(0);
  });

  it("labels unconfigured Elastic with not-configured fallback text", async () => {
    const result = await searchSessions(fixtureEnv(), {
      text: "kubernetes incident",
      field: "search_text",
      size: 5,
    });

    expect(result.fallback).toContain("not configured");
    expect(result.fallback).not.toContain("failed");
  });
});
