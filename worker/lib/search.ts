import type { Session } from "../../shared/types";
import type { Env } from "../env";
import { loadAgenda } from "./agenda";

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

/**
 * Keyword match over the agenda. The Data slice adds Elastic semantic search and
 * should keep this signature, falling back here when Elastic is missing or errors.
 * Phase 0 always uses the keyword path.
 */
export async function searchSessions(env: Env, query: SearchQuery): Promise<SearchResult> {
  const agenda = await loadAgenda(env);
  const fallback = agenda.source === "fixture"
    ? "Keyword match on the bundled agenda sample because Elastic search is not configured."
    : "Keyword match on the agenda because Elastic search is not configured.";
  const field: SearchField = query.field === "speaker_text" ? "speaker_text" : "search_text";
  const size = Math.min(60, Math.max(1, Math.floor(query.size ?? 20)));
  if (query.day !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(query.day)) {
    return { hits: [], source: "fallback", fallback: "Day filter must be YYYY-MM-DD." };
  }

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
