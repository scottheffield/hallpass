import type { CheckIn, Plan, Profile, Readout } from "../../shared/types";
import type { Env } from "../env";
import { elastic, indexName } from "../lib/elastic";
import { HttpError } from "../lib/http";
import type { CheckInRow, OrganizerRows, ProfileRow, ReadoutRow } from "./rows";
import { EMPTY_ROWS } from "./rows";
import { seedOrganizerRows } from "./seed";

interface EsHit<T> {
  _source?: T;
}

interface EsSearch<T> {
  hits?: { hits?: EsHit<T>[] };
}

function elasticOn(env: Env): boolean {
  return Boolean(env.ELASTIC_URL && env.ELASTIC_API_KEY);
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

async function searchIndex<T>(env: Env, kind: "profiles" | "plans" | "checkins" | "readouts", size: number): Promise<T[]> {
  const index = indexName(env, kind);
  const result = await elastic<EsSearch<T>>(env, "POST", `/${index}/_search`, {
    size,
    query: { match_all: {} },
  });
  return (result.hits?.hits ?? []).flatMap((hit) => (hit._source ? [hit._source] : []));
}

/** Load organizer rows. Elastic results are aggregated in memory; without Elastic, seeded demo rows are used. */
export async function loadOrganizerRows(env: Env): Promise<{ rows: OrganizerRows; stub: boolean }> {
  if (!elasticOn(env)) {
    return { rows: seedOrganizerRows(), stub: true };
  }

  try {
    const [profilesRaw, plansRaw, checkinsRaw, readoutsRaw] = await Promise.all([
      searchIndex<Profile>(env, "profiles", 500),
      searchIndex<Plan>(env, "plans", 500),
      searchIndex<CheckIn>(env, "checkins", 2000),
      searchIndex<Readout>(env, "readouts", 500),
    ]);

    const profiles = profilesRaw.flatMap((doc) => {
      const row = profileRow(doc);
      return row ? [row] : [];
    });
    const checkins = checkinsRaw.flatMap((doc) => {
      const row = checkInRow(doc);
      return row ? [row] : [];
    });
    const readouts = readoutsRaw.flatMap((doc) => {
      const row = readoutRow(doc);
      return row ? [row] : [];
    });

    if (profiles.length === 0 && checkins.length === 0 && readouts.length === 0 && plansRaw.length === 0) {
      return { rows: EMPTY_ROWS, stub: false };
    }

    return {
      rows: {
        profiles,
        plans: plansRaw.length,
        checkins,
        readouts,
      },
      stub: false,
    };
  } catch (err) {
    if (err instanceof HttpError) throw err;
    console.error("insights_fetch", { name: err instanceof Error ? err.name : "unknown" });
    return { rows: EMPTY_ROWS, stub: false };
  }
}
