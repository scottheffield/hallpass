/**
 * Create Hallpass Elastic indexes and bulk-load hallpass-sessions.
 *
 * Run only when ELASTIC_URL and ELASTIC_API_KEY are current:
 *   node --env-file=.dev.vars scripts/elastic-setup.mjs
 *
 * Reads those values from the environment. Does not print them, write them,
 * or read them from the repo. This file does not run unless you execute it.
 *
 * Sessions always go to the shared index hallpass-sessions.
 * Other index names use ELASTIC_INDEX_PREFIX (default hallpass).
 */
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SESSIONS_INDEX = "hallpass-sessions";
const PREFIX = process.env.ELASTIC_INDEX_PREFIX || "hallpass";
const INFERENCE_ID = process.env.ELASTIC_INFERENCE_ID || ".elser-2-elastic";
const RETRY = new Set([429, 502, 503, 504]);
const OTHER = ["profiles", "plans", "checkins", "readouts", "cases"];

const url = process.env.ELASTIC_URL;
const key = process.env.ELASTIC_API_KEY;
if (!url || !key) {
  console.log("ingest did not run: elastic is not configured");
  process.exit(0);
}

const agenda = JSON.parse(await readFile(join(root, "public", "agenda.json"), "utf8"));
const started = Date.now();

const sessionMappings = {
  properties: {
    title: { type: "text" },
    track: { type: "keyword" },
    room: { type: "keyword" },
    speakers: { type: "keyword" },
    tags: { type: "keyword" },
    start: { type: "date" },
    end: { type: "date" },
    abstract: { type: "text", index: false },
    search_text: { type: "semantic_text", inference_id: INFERENCE_ID },
    speaker_text: { type: "semantic_text", inference_id: INFERENCE_ID },
  },
};

const keywordMappings = {
  properties: {
    attendee_id: { type: "keyword" },
    session_id: { type: "keyword" },
    goal_themes: { type: "keyword" },
    gap_themes: { type: "keyword" },
    worth_it: { type: "keyword" },
    moved_goal: { type: "keyword" },
    pacing: { type: "keyword" },
  },
};

const sessionsReady = await ensureIndex(SESSIONS_INDEX, sessionMappings);
if (!sessionsReady) {
  console.log("ingest did not run");
  process.exit(0);
}
for (const kind of OTHER) {
  const ready = await ensureIndex(`${PREFIX}-${kind}`, keywordMappings);
  if (!ready) {
    console.log("ingest did not run");
    process.exit(0);
  }
}

let indexed = 0;
const docs = agenda.sessions.map((session) => ({
  id: session.id,
  body: {
    title: session.title,
    track: session.track,
    room: session.room,
    speakers: session.speakers,
    tags: session.tags || [],
    start: session.start,
    end: session.end,
    abstract: session.abstract,
    search_text: session.search_text,
    speaker_text: session.speaker_text,
  },
}));

for (let i = 0; i < docs.length; i += 50) {
  const batch = docs.slice(i, i + 50);
  const lines = [];
  for (const doc of batch) {
    lines.push(JSON.stringify({ index: { _index: SESSIONS_INDEX, _id: doc.id } }));
    lines.push(JSON.stringify(doc.body));
  }
  const result = await elastic("POST", "/_bulk", `${lines.join("\n")}\n`, "application/x-ndjson");
  if (!result.ok) {
    console.log(`ingest did not run: bulk status ${result.status} indexed ${indexed} ms ${Date.now() - started}`);
    process.exit(0);
  }
  let payload;
  try {
    payload = JSON.parse(result.text);
  } catch {
    console.log(`ingest did not run: bulk response was not json indexed ${indexed}`);
    process.exit(0);
  }
  const failed = (payload.items || []).filter((item) => {
    const status = item.index?.status;
    return status >= 300;
  });
  if (payload.errors || failed.length) {
    const status = failed[0]?.index?.status ?? 0;
    console.log(`ingest did not run: bulk item status ${status} indexed ${indexed} ms ${Date.now() - started}`);
    process.exit(0);
  }
  indexed += batch.length;
  console.log(`indexed ${indexed} ms ${Date.now() - started}`);
}

console.log(`ingest complete count ${indexed} ms ${Date.now() - started}`);

async function ensureIndex(index, mappings) {
  const head = await elastic("HEAD", `/${index}`);
  if (head.status === 200) {
    const put = await elastic("PUT", `/${index}/_mapping`, JSON.stringify({ properties: mappings.properties }));
    if (!put.ok) {
      console.log(`mapping status ${put.status} index_kind ${index === SESSIONS_INDEX ? "sessions" : "other"}`);
      return false;
    }
    return true;
  }
  if (head.status !== 404) {
    console.log(`index status ${head.status}`);
    return false;
  }
  const created = await elastic("PUT", `/${index}`, JSON.stringify({ mappings }));
  if (!created.ok) {
    console.log(`create status ${created.status} index_kind ${index === SESSIONS_INDEX ? "sessions" : "other"}`);
    return false;
  }
  return true;
}

async function elastic(method, path, body, contentType = "application/json") {
  const headers = {
    authorization: `ApiKey ${key}`,
    accept: "application/json",
  };
  if (body !== undefined) headers["content-type"] = contentType;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    let response;
    try {
      response = await fetch(new URL(path, url), {
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
