/**
 * Pull the KubeCon NA 2026 schedule and write agenda, rooms, and the session sample.
 *
 * The only network call is the public Linux Foundation schedule page.
 * This script does not read Elastic settings and does not index anything.
 *
 *   node scripts/fetch-agenda.mjs            # use scripts/.cache when present
 *   node scripts/fetch-agenda.mjs --refresh  # download the schedule page again
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SCHEDULE_URL,
  buildRooms,
  formatMountain,
  normalizeSched,
  sessionsSample,
} from "./agenda.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cachePath = join(root, "scripts", ".cache", "schedule.html");
const refresh = process.argv.includes("--refresh");

const html = await loadHtml();
const sched = JSON.parse(extractSchedJson(html));
const pulledAt = formatMountain(new Date());
const { agenda, counts, dropped } = normalizeSched(sched, { pulledAt });
const hints = JSON.parse(await readFile(join(root, "scripts", "room-hints.json"), "utf8"));
const rooms = buildRooms(agenda.sessions, hints);
const sample = sessionsSample(agenda);

await mkdir(join(root, "public"), { recursive: true });
await mkdir(join(root, "shared", "fixtures"), { recursive: true });
await writeFile(join(root, "public", "agenda.json"), `${JSON.stringify(agenda, null, 2)}\n`);
await writeFile(
  join(root, "public", "agenda.meta.json"),
  `${JSON.stringify(
    {
      companion: "public/agenda.json",
      source: agenda.source,
      pulled_at: agenda.pulled_at,
      attribution:
        "The Linux Foundation, KubeCon + CloudNativeCon North America 2026 schedule. Used with attribution. No affiliation or endorsement.",
    },
    null,
    2,
  )}\n`,
);
await writeFile(join(root, "public", "rooms.json"), `${JSON.stringify(rooms, null, 2)}\n`);
await writeFile(join(root, "shared", "fixtures", "sessions-sample.json"), `${JSON.stringify(sample, null, 2)}\n`);

console.log(
  JSON.stringify({
    pulled_at: pulledAt,
    total: counts.total,
    dropped: counts.dropped,
    kept: counts.kept,
    empty_descriptions: counts.emptyDescriptions,
    per_day: counts.perDay,
    rooms: rooms.length,
    hinted_rooms: rooms.filter((room) => room.walking_hint).length,
    sample: sample.sessions.length,
  }),
);
console.log("dropped_titles");
for (const row of dropped) console.log(`${row.day}\t${row.track}\t${row.title}`);

async function loadHtml() {
  if (!refresh) {
    try {
      return await readFile(cachePath, "utf8");
    } catch (err) {
      if (err?.code !== "ENOENT") throw err;
    }
  }
  const response = await fetch(SCHEDULE_URL, {
    headers: {
      accept: "text/html",
      "user-agent": "HallpassAgendaFetch/1.0 (conference schedule; attribution)",
    },
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    throw new Error(`schedule page returned ${response.status}`);
  }
  const body = await response.text();
  await mkdir(dirname(cachePath), { recursive: true });
  await writeFile(cachePath, body);
  return body;
}

function extractSchedJson(page) {
  const match = page.match(/<script\b[^>]*\bclass="sched-data"[^>]*>([\s\S]*?)<\/script>/i);
  if (!match) throw new Error("sched-data script not found");
  return match[1];
}
