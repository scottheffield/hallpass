import type { Session } from "../../shared/types";
import type { Env } from "../env";
import { loadAgenda, type LoadedAgenda } from "./agenda";
import { elastic } from "./elastic";
import { HttpError } from "./http";

export type SearchField = "search_text" | "speaker_text";

export interface SearchQuery {
  text: string;
  field: SearchField;
  /** Conference date, `YYYY-MM-DD`. Omit to search every day. */
  day?: string;
  size?: number;
}

export interface SearchHit {
  session: Session;
  score: number;
  source: "elastic" | "fallback";
}

export interface SearchResult {
  hits: SearchHit[];
  source: "elastic" | "fallback";
  /** Why this is not an Elastic semantic query. Safe to show. No attendee text. */
  fallback?: string;
}

const ELASTIC_SEARCH_TIMEOUT_MS = 2500;
const STOP = new Set(["a", "an", "the", "of", "to", "and", "or", "for", "in", "on", "at", "we", "it", "is", "be"]);

function tokens(text: string): string[] {
  const words = text.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length >= 2 && !STOP.has(word));
  return [...new Set(words)];
}

function scoreField(haystack: string, needles: string[]): number {
  const hay = haystack.toLowerCase();
  let score = 0;
  for (const needle of needles) {
    if (hay.includes(needle)) score += 1;
  }
  return score;
}

function addCalendarDays(day: string, days: number): string {
  const [year, month, date] = day.split("-").map((part) => Number(part));
  const next = new Date(year, month - 1, date + days);
  const y = next.getFullYear();
  const m = String(next.getMonth() + 1).padStart(2, "0");
  const d = String(next.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function conferenceDayRange(day: string): { gte: string; lt: string } {
  return {
    gte: `${day}T00:00:00-07:00`,
    lt: `${addCalendarDays(day, 1)}T00:00:00-07:00`,
  };
}

/** Elastic `_search` body for semantic_text match. Exported for tests. */
export function buildElasticSearchBody(query: SearchQuery): Record<string, unknown> {
  const field: SearchField = query.field === "speaker_text" ? "speaker_text" : "search_text";
  const size = Math.min(60, Math.max(1, Math.floor(query.size ?? 20)));
  const matchClause = {
    match: {
      [field]: { query: query.text },
    },
  };
  if (query.day !== undefined) {
    const range = conferenceDayRange(query.day);
    return {
      size,
      query: {
        bool: {
          must: [matchClause],
          filter: [{ range: { start: range } }],
        },
      },
    };
  }
  return { size, query: matchClause };
}

interface ElasticSearchHit {
  _id: string;
  _score?: number;
}

interface ElasticSearchResponse {
  hits?: { hits?: ElasticSearchHit[] };
}

function fallbackMessage(agenda: LoadedAgenda): string {
  return agenda.source === "fixture"
    ? "Keyword match on the bundled agenda sample because Elastic search is not configured."
    : "Keyword match on the agenda because Elastic search is not configured.";
}

function keywordSearch(
  agenda: LoadedAgenda,
  query: SearchQuery,
  field: SearchField,
  size: number,
  fallback: string,
): SearchResult {
  const needles = tokens(query.text);
  if (needles.length === 0) return { hits: [], source: "fallback", fallback };

  const ranked = agenda.sessions
    .filter((session) => query.day === undefined || session.start.slice(0, 10) === query.day)
    .map((session) => ({ session, score: scoreField(session[field] ?? "", needles) }))
    .filter((row) => row.score > 0)
    .sort(
      (a, b) => b.score - a.score || a.session.start.localeCompare(b.session.start) || a.session.id.localeCompare(b.session.id),
    )
    .slice(0, size);

  return {
    hits: ranked.map((row) => ({ session: row.session, score: row.score, source: "fallback" as const })),
    source: "fallback",
    fallback,
  };
}

function elasticFallbackStatus(err: unknown): number {
  if (err instanceof HttpError) return err.status;
  return 0;
}

async function tryElasticSearch(env: Env, query: SearchQuery, agenda: LoadedAgenda): Promise<SearchResult | null> {
  if (!env.ELASTIC_URL || !env.ELASTIC_API_KEY) return null;

  try {
    const response = await elastic<ElasticSearchResponse>(
      env,
      "POST",
      `/${env.SESSIONS_INDEX}/_search`,
      buildElasticSearchBody(query),
      { timeoutMs: ELASTIC_SEARCH_TIMEOUT_MS },
    );
    const rawHits = response.hits?.hits ?? [];
    if (rawHits.length === 0) {
      console.error("search_fallback", { status: 200 });
      return null;
    }

    const byId = new Map(agenda.sessions.map((session) => [session.id, session]));
    const hits: SearchHit[] = [];
    for (const hit of rawHits) {
      const session = byId.get(hit._id);
      if (!session) continue;
      hits.push({
        session,
        score: typeof hit._score === "number" ? hit._score : 0,
        source: "elastic",
      });
    }

    if (hits.length === 0) {
      console.error("search_fallback", { status: 200 });
      return null;
    }

    return { hits, source: "elastic" };
  } catch (err) {
    console.error("search_fallback", { status: elasticFallbackStatus(err) });
    return null;
  }
}

/**
 * Semantic search over hallpass-sessions when Elastic is configured; keyword match on the agenda otherwise.
 */
export async function searchSessions(env: Env, query: SearchQuery): Promise<SearchResult> {
  const agenda = await loadAgenda(env);
  const fallback = fallbackMessage(agenda);
  const field: SearchField = query.field === "speaker_text" ? "speaker_text" : "search_text";
  const size = Math.min(60, Math.max(1, Math.floor(query.size ?? 20)));
  if (query.day !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(query.day)) {
    return { hits: [], source: "fallback", fallback: "Day filter must be YYYY-MM-DD." };
  }

  const elasticResult = await tryElasticSearch(env, query, agenda);
  if (elasticResult) return elasticResult;

  return keywordSearch(agenda, query, field, size, fallback);
}
