import type { CheckIn, Profile, Readout } from "../../shared/types";
import type { Env } from "../env";
import { loadAgenda } from "../lib/agenda";
import { elastic, indexName } from "../lib/elastic";
import { HttpError } from "../lib/http";
import { agendaIsAuthoritative } from "./agenda-guard";
import { checkInsOnAgenda } from "./filter";
import type { CheckInRow, OrganizerRows, ProfileRow, ReadoutRow } from "./rows";
import { EMPTY_ROWS } from "./rows";
import { seedOrganizerRows } from "./seed";

const PAGE_SIZE = 500;
const PIT_KEEP_ALIVE = "2m";

interface EsHit<T> {
  _source?: T;
  sort?: unknown[];
}

interface EsSearch<T> {
  hits?: { hits?: EsHit<T>[] };
}

interface EsCount {
  count?: number;
}

function elasticOn(env: Env): boolean {
  return Boolean(env.ELASTIC_URL && env.ELASTIC_API_KEY);
}

function isMissingIndex(err: unknown): boolean {
  return err instanceof HttpError && /Elastic returned 404/.test(err.message);
}

function profileRow(source: Profile): ProfileRow | null {
  if (!source || typeof source !== "object") return null;
  const pacing = source.pacing;
  if (pacing !== "light" && pacing !== "balanced" && pacing !== "packed") return null;
  const themes = Array.isArray(source.goal_themes)
    ? source.goal_themes.filter((theme): theme is string => typeof theme === "string")
    : [];
  const wants_break = pacing === "light" || (typeof source.breaks === "string" && source.breaks.trim().length > 0);
  return { goal_themes: themes, pacing, wants_break };
}

function checkInRow(source: CheckIn): CheckInRow | null {
  if (!source?.session_id || typeof source.session_id !== "string") return null;
  const moved = source.moved_goal;
  if (moved !== "yes" && moved !== "a_little" && moved !== "no") return null;
  return { session_id: source.session_id, moved_goal: moved };
}

function readoutRow(source: Readout): ReadoutRow | null {
  const themes = Array.isArray(source.gap_themes)
    ? source.gap_themes.filter((theme): theme is string => typeof theme === "string")
    : [];
  return { gap_themes: themes };
}

async function countDocuments(env: Env, kind: "plans"): Promise<number | "failed"> {
  const index = indexName(env, kind);
  try {
    const result = await elastic<EsCount>(env, "POST", `/${index}/_count`, { query: { match_all: {} } });
    return result.count ?? 0;
  } catch (err) {
    if (isMissingIndex(err)) return 0;
    return "failed";
  }
}

async function openPit(env: Env, index: string): Promise<string | null | "failed"> {
  try {
    const result = await elastic<{ id?: string }>(env, "POST", `/${index}/_pit?keep_alive=${PIT_KEEP_ALIVE}`);
    if (!result.id) return "failed";
    return result.id;
  } catch (err) {
    if (isMissingIndex(err)) return null;
    return "failed";
  }
}

async function closePit(env: Env, pitId: string): Promise<void> {
  try {
    await elastic(env, "DELETE", "/_pit", { id: pitId });
  } catch (err) {
    console.error("insights_pit_close", { name: err instanceof Error ? err.name : "unknown" });
  }
}

async function searchAll<T>(
  env: Env,
  kind: "profiles" | "checkins" | "readouts",
  fields: string[],
): Promise<T[] | "failed"> {
  const index = indexName(env, kind);
  const pitId = await openPit(env, index);
  if (pitId === "failed") return "failed";
  if (pitId === null) return [];

  const all: T[] = [];
  let searchAfter: unknown[] | undefined;
  try {
    for (;;) {
      const body: Record<string, unknown> = {
        size: PAGE_SIZE,
        query: { match_all: {} },
        sort: [{ _shard_doc: "asc" }],
        pit: { id: pitId, keep_alive: PIT_KEEP_ALIVE },
        _source: fields,
      };
      if (searchAfter) body.search_after = searchAfter;

      const result = await elastic<EsSearch<T>>(env, "POST", "/_search", body);
      const hits = result.hits?.hits ?? [];
      all.push(...hits.flatMap((hit) => (hit._source ? [hit._source] : [])));
      if (hits.length < PAGE_SIZE) break;
      const last = hits.at(-1);
      if (!last?.sort) break;
      searchAfter = last.sort;
    }
    return all;
  } catch (err) {
    if (isMissingIndex(err) && all.length === 0) return [];
    return "failed";
  } finally {
    await closePit(env, pitId);
  }
}

function logFetchFailure(kind: string): void {
  console.error("insights_fetch", { kind });
}

/** Load organizer rows. Elastic results are aggregated in memory; without Elastic, seeded demo rows are used. */
export async function loadOrganizerRows(env: Env): Promise<{ rows: OrganizerRows; stub: boolean }> {
  if (!elasticOn(env)) {
    return { rows: seedOrganizerRows(), stub: true };
  }

  const agenda = await loadAgenda(env);
  if (!agendaIsAuthoritative(agenda)) {
    console.error("insights_agenda", { source: agenda.source });
    return { rows: seedOrganizerRows(), stub: true };
  }

  const [plansCount, profilesRaw, checkinsRaw, readoutsRaw] = await Promise.all([
    countDocuments(env, "plans"),
    searchAll<Profile>(env, "profiles", ["goal_themes", "pacing", "breaks"]),
    searchAll<CheckIn>(env, "checkins", ["session_id", "moved_goal"]),
    searchAll<Readout>(env, "readouts", ["gap_themes"]),
  ]);

  if (plansCount === "failed" || profilesRaw === "failed" || checkinsRaw === "failed" || readoutsRaw === "failed") {
    if (plansCount === "failed") logFetchFailure("plans");
    if (profilesRaw === "failed") logFetchFailure("profiles");
    if (checkinsRaw === "failed") logFetchFailure("checkins");
    if (readoutsRaw === "failed") logFetchFailure("readouts");
    return { rows: seedOrganizerRows(), stub: true };
  }

  const profiles = profilesRaw.flatMap((doc) => {
    const row = profileRow(doc);
    return row ? [row] : [];
  });

  const agendaIds = new Set(agenda.sessions.map((session) => session.id));
  const checkins = checkInsOnAgenda(
    checkinsRaw.flatMap((doc) => {
      const row = checkInRow(doc);
      return row ? [row] : [];
    }),
    agendaIds,
  );

  const readouts = readoutsRaw.flatMap((doc) => {
    const row = readoutRow(doc);
    return row ? [row] : [];
  });

  if (profiles.length === 0 && checkins.length === 0 && readouts.length === 0 && plansCount === 0) {
    return { rows: EMPTY_ROWS, stub: false };
  }

  return {
    rows: {
      profiles,
      plans: plansCount,
      checkins,
      readouts,
    },
    stub: false,
  };
}
