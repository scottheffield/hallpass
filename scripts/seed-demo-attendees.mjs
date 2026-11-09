/**
 * Write fictional sample attendees for organizer Insights.
 *
 * Run only against your own Elastic prefix (never production hallpass-*):
 *   node --env-file=.dev.vars scripts/seed-demo-attendees.mjs
 *
 * Requires ELASTIC_URL, ELASTIC_API_KEY, and ELASTIC_INDEX_PREFIX set in the
 * environment (for example hallpass-intake). Refuses the shared prefix "hallpass"
 * unless SEED_ALLOW_SHARED_PREFIX is set to that same value exactly (opt-in for
 * live demo indexes). Does not write hallpass-sessions. Does not print secrets.
 */
import { realpathSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SAMPLE = "Sample data. Fictional attendee for organizer insights.";
const ATTENDEE_COUNT = 30;
const RNG_SEED = 0x22_25_35;
const EVENT_DAYS = ["2026-11-10", "2026-11-11", "2026-11-12"];
const GOAL_THEME_IDS = [
  "incident-response",
  "observability",
  "platform-engineering",
  "ai-inference",
  "security",
  "networking",
  "delivery",
  "cost",
  "developer-experience",
  "data-storage",
  "community",
];
const STARTER_GOALS = [
  "Find practical ways to debug production Kubernetes.",
  "See how platform teams run AI inference.",
  "Learn one security practice to take home.",
  "Meet people who run platforms like mine.",
  "Leave with a clearer incident response workflow.",
  "Understand cost tradeoffs for inference at scale.",
];
const ROLES = ["SRE", "Platform engineer", "Software engineer", "DevOps engineer", "Architect"];
const ENERGIES = ["low", "medium", "high"];
const PACINGS = ["packed", "balanced", "light"];
const WORTH = ["yes", "mixed", "no"];
const MOVED = ["yes", "a_little", "no"];
const RETRY = new Set([429, 502, 503, 504]);
const FORBIDDEN_PREFIXES = new Set(["hallpass"]);

/** @returns {{ allowed: boolean; prefix: string }} */
export function resolveSeedPrefix(elasticIndexPrefix, allowSharedPrefix) {
  const prefix = elasticIndexPrefix?.trim() || "hallpass";
  if (!FORBIDDEN_PREFIXES.has(prefix)) return { allowed: true, prefix };
  if (allowSharedPrefix?.trim() === prefix) return { allowed: true, prefix };
  return { allowed: false, prefix };
}

/** @returns {boolean} */
export function pathsAreSameFile(a, b) {
  try {
    return realpathSync(a) === realpathSync(b);
  } catch {
    return false;
  }
}

function isDirectRun() {
  const entry = process.argv[1];
  if (!entry) return false;
  return pathsAreSameFile(fileURLToPath(import.meta.url), entry);
}

function buildAttendee(attendee_id, index, sessionsByDay, popularIds, allSessions, random) {
  const themeCount = 1 + (index % 3);
  const goal_themes = [];
  for (let t = 0; t < themeCount; t += 1) {
    const theme = GOAL_THEME_IDS[(index + t * 3) % GOAL_THEME_IDS.length];
    if (!goal_themes.includes(theme)) goal_themes.push(theme);
  }

  const goals = [];
  for (let g = 0; g < Math.min(3, 1 + (index % 3)); g += 1) {
    goals.push(STARTER_GOALS[(index + g) % STARTER_GOALS.length]);
  }

  const pacing = PACINGS[index % PACINGS.length];
  const profile = {
    attendee_id,
    why_summary: SAMPLE,
    goals,
    goal_themes,
    role: ROLES[index % ROLES.length],
    problems: ["Sample problem statement for demo aggregates."],
    topics: goal_themes.map((id) => id.replace(/-/g, " ")),
    tools: ["Kubernetes", "OpenTelemetry"].slice(0, 1 + (index % 2)),
    people_to_see: [],
    expertise_to_see: ["Sample domain expert (fictional)."],
    energy: ENERGIES[index % ENERGIES.length],
    pacing,
    breaks: pacing === "light" ? "Sample schedule: longer gaps between sessions." : "Sample schedule: standard breaks.",
    updated_at: "2026-11-09T12:00:00-07:00",
  };

  const planItemsByDay = {};
  const chosen = new Set();
  for (const day of EVENT_DAYS) {
    const pool = sessionsByDay.get(day) ?? [];
    const n = 2 + (index % 2);
    const items = [];
    for (let p = 0; p < n; p += 1) {
      const biasPopular = random() < 0.55;
      const session = pickSession(pool, popularIds, chosen, biasPopular, random);
      if (!session) break;
      chosen.add(session.id);
      items.push({
        session_id: session.id,
        status: "planned",
        reason: `Sample plan item for theme ${goal_themes[p % goal_themes.length]}.`,
      });
    }
    if (items.length) {
      planItemsByDay[day] = {
        items,
        breaks: [
          {
            start: `${day}T12:30:00-07:00`,
            end: `${day}T13:30:00-07:00`,
            note: "Sample lunch block.",
          },
        ],
      };
    }
  }

  const plan = {
    attendee_id,
    days: planItemsByDay,
    source: "basic",
    updated_at: "2026-11-09T12:00:00-07:00",
  };

  const planSessionIds = [...chosen];
  const checkinCount = 2 + (index % 5);
  const checkins = [];
  const shuffled = shuffle(planSessionIds, random);
  for (let c = 0; c < Math.min(checkinCount, shuffled.length); c += 1) {
    const session_id = shuffled[c];
    const session = findSession(allSessions, session_id);
    const moved_goal = pickMovedGoal(index, c, session_id, popularIds);
    checkins.push({
      attendee_id,
      session_id,
      at: session?.end ?? `${EVENT_DAYS[c % EVENT_DAYS.length]}T17:00:00-07:00`,
      worth_it: WORTH[(index + c) % WORTH.length],
      moved_goal,
    });
  }

  const helped_sessions = checkins
    .filter((row) => row.moved_goal === "yes" || row.moved_goal === "a_little")
    .map((row) => row.session_id);

  const goals_hit = helped_sessions.length ? goals.slice(0, 1) : [];
  const goals_missed = goals.length > goals_hit.length ? goals.slice(goals_hit.length) : [];
  const gap_themes = goals_missed.length ? goal_themes.slice(0, Math.min(2, goal_themes.length)) : [];

  const readout = {
    attendee_id,
    as_of: "2026-11-12T17:00:00-07:00",
    final: index % 4 === 0,
    goals_hit,
    goals_missed,
    helped_sessions,
    gaps: goals_missed.length ? ["Sample gap: need more hands-on time."] : [],
    gap_themes,
    followups: ["Sample follow-up: try one workflow change at work."],
  };

  return { profile, plan, checkins, readout };
}

function groupPlanableSessions(sessions) {
  const byDay = new Map();
  for (const session of sessions) {
    if (!session?.id || !session.start?.endsWith("-07:00")) continue;
    const day = session.start.slice(0, 10);
    if (!EVENT_DAYS.includes(day)) continue;
    const duration = Date.parse(session.end) - Date.parse(session.start);
    if (!Number.isFinite(duration) || duration <= 0 || duration > 3 * 60 * 60 * 1000) continue;
    if (session.all_access) continue;
    const list = byDay.get(day) ?? [];
    list.push(session);
    byDay.set(day, list);
  }
  for (const list of byDay.values()) {
    list.sort((a, b) => a.id.localeCompare(b.id));
  }
  return byDay;
}

function pickPopularSessions(byDay, count) {
  const merged = [];
  for (const day of EVENT_DAYS) {
    merged.push(...(byDay.get(day) ?? []));
  }
  merged.sort((a, b) => a.id.localeCompare(b.id));
  return merged.slice(0, count).map((s) => s.id);
}

function pickSession(pool, popularIds, used, preferPopular, random) {
  if (!pool.length) return null;
  const popularInPool = pool.filter((s) => popularIds.includes(s.id) && !used.has(s.id));
  const general = pool.filter((s) => !used.has(s.id));
  const source =
    preferPopular && popularInPool.length ? popularInPool : general.length ? general : popularInPool.length ? popularInPool : pool;
  if (!source.length) return null;
  return source[Math.floor(random() * source.length)];
}

function pickMovedGoal(attendeeIndex, checkinIndex, sessionId, popularIds) {
  const popularBoost = popularIds.indexOf(sessionId);
  const slot = attendeeIndex + checkinIndex + Math.max(0, popularBoost);
  if (popularBoost >= 0 && slot % 3 !== 2) return slot % 5 === 0 ? "a_little" : "yes";
  return MOVED[slot % MOVED.length];
}

function findSession(sessions, id) {
  return sessions.find((s) => s.id === id);
}

function shuffle(items, random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

async function putDoc(elasticUrl, elasticKey, index, id, doc) {
  const result = await elastic(elasticUrl, elasticKey, "PUT", `/${index}/_doc/${encodeURIComponent(id)}`, JSON.stringify(doc));
  if (!result.ok) {
    console.log(`seed failed status ${result.status} index ${index}`);
    process.exit(1);
  }
}

async function elastic(elasticUrl, elasticKey, method, path, body, contentType = "application/json") {
  const headers = {
    authorization: `ApiKey ${elasticKey}`,
    accept: "application/json",
  };
  if (body !== undefined) headers["content-type"] = contentType;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    let response;
    try {
      response = await fetch(new URL(path, elasticUrl), {
        method,
        headers,
        body,
        signal: AbortSignal.timeout(180_000),
      });
    } catch (err) {
      if (attempt < 4) {
        await sleep(1000 * 2 ** attempt);
        continue;
      }
      console.log(`elastic_error name ${err?.name || "Error"}`);
      return { ok: false, status: 0, text: "" };
    }
    if (RETRY.has(response.status) && attempt < 4) {
      console.log(`retry status ${response.status}`);
      await sleep(1000 * 2 ** attempt);
      continue;
    }
    const text = method === "HEAD" ? "" : await response.text();
    return { ok: response.ok, status: response.status, text };
  }
  return { ok: false, status: 0, text: "" };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const url = process.env.ELASTIC_URL;
  const key = process.env.ELASTIC_API_KEY;
  const { allowed, prefix } = resolveSeedPrefix(
    process.env.ELASTIC_INDEX_PREFIX,
    process.env.SEED_ALLOW_SHARED_PREFIX,
  );

  if (!url || !key) {
    console.log("seed did not run: elastic is not configured");
    process.exit(0);
  }

  if (!allowed) {
    console.log(
      "seed did not run: set ELASTIC_INDEX_PREFIX to your own dev prefix, or SEED_ALLOW_SHARED_PREFIX=hallpass to seed live",
    );
    process.exit(1);
  }

  const agenda = JSON.parse(await readFile(join(root, "public", "agenda.json"), "utf8"));
  const byDay = groupPlanableSessions(agenda.sessions);
  const popular = pickPopularSessions(byDay, 18);
  const started = Date.now();
  const rng = mulberry32(RNG_SEED);

  const bundles = [];
  for (let i = 1; i <= ATTENDEE_COUNT; i += 1) {
    const attendee_id = `seed_${String(i).padStart(3, "0")}`;
    bundles.push(buildAttendee(attendee_id, i - 1, byDay, popular, agenda.sessions, rng));
  }

  let written = 0;
  for (const bundle of bundles) {
    await putDoc(url, key, `${prefix}-profiles`, bundle.profile.attendee_id, bundle.profile);
    await putDoc(url, key, `${prefix}-plans`, bundle.plan.attendee_id, bundle.plan);
    for (const checkin of bundle.checkins) {
      const id = `${checkin.attendee_id}:${checkin.session_id}`;
      await putDoc(url, key, `${prefix}-checkins`, id, checkin);
    }
    await putDoc(url, key, `${prefix}-readouts`, bundle.readout.attendee_id, bundle.readout);
    written += 1;
    if (written % 10 === 0) {
      console.log(`seeded ${written} attendees ms ${Date.now() - started}`);
    }
  }

  console.log(
    `seed complete attendees ${written} checkins ${bundles.reduce((n, b) => n + b.checkins.length, 0)} prefix ${prefix} ms ${
      Date.now() - started
    }`,
  );
}

if (isDirectRun()) {
  await main();
}
