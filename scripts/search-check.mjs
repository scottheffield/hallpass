/**
 * Smoke-test goal-style search against hallpass-sessions after ingest.
 *
 *   node --env-file=.dev.vars scripts/search-check.mjs
 *
 * Reads ELASTIC_URL and ELASTIC_API_KEY from the environment only. Does not print them.
 * Does not run unless you execute it.
 */
const SESSIONS_INDEX = "hallpass-sessions";
const SIZE = 5;
const RANK_WINDOW = 50;

const GOAL_QUERIES = [
  "we spend too long finding the cause of Kubernetes incidents",
  "running LLM inference on the platform we already operate",
  "platform engineering internal developer portal practical",
  "OpenTelemetry tracing at scale production kubernetes",
  "multi agent AI workloads on kubernetes operations",
  "missing context during incident response deploy ownership",
];

const url = process.env.ELASTIC_URL;
const key = process.env.ELASTIC_API_KEY;
if (!url || !key) {
  console.log("search check did not run: elastic is not configured");
  process.exit(0);
}

for (const text of GOAL_QUERIES) {
  console.log("\nquery");
  console.log(text);

  const semantic = await search(text, "semantic");
  console.log("mode semantic");
  printHits(semantic);

  const hybrid = await search(text, "hybrid");
  console.log("mode hybrid_rrf");
  printHits(hybrid);
}

async function search(text, mode) {
  const body =
    mode === "semantic"
      ? {
          size: SIZE,
          _source: ["title", "track", "start", "room"],
          query: {
            match: {
              search_text: {
                query: text,
              },
            },
          },
        }
      : {
          size: SIZE,
          _source: ["title", "track", "start", "room"],
          retriever: {
            rrf: {
              rank_window_size: RANK_WINDOW,
              retrievers: [
                {
                  standard: {
                    query: {
                      match: {
                        search_text: {
                          query: text,
                        },
                      },
                    },
                  },
                },
                {
                  standard: {
                    query: {
                      multi_match: {
                        query: text,
                        fields: ["title^2", "track", "speakers"],
                      },
                    },
                  },
                },
              ],
            },
          },
        };

  const response = await elastic("POST", `/${SESSIONS_INDEX}/_search`, JSON.stringify(body));
  if (!response.ok) {
    console.log(`search status ${response.status} mode ${mode}`);
    return [];
  }
  let payload;
  try {
    payload = JSON.parse(response.text);
  } catch {
    console.log(`search parse_error mode ${mode}`);
    return [];
  }
  return payload.hits?.hits ?? [];
}

function printHits(hits) {
  if (!hits.length) {
    console.log("hits 0");
    return;
  }
  hits.slice(0, SIZE).forEach((hit, index) => {
    const title = hit._source?.title ?? "(no title)";
    const score = hit._score ?? 0;
    const track = hit._source?.track ?? "";
    console.log(`${index + 1}\t${score.toFixed(4)}\t${track}\t${title}`);
  });
}

async function elastic(method, path, body) {
  const headers = {
    authorization: `ApiKey ${key}`,
    accept: "application/json",
    "content-type": "application/json",
  };
  try {
    const response = await fetch(new URL(path, url), {
      method,
      headers,
      body,
      signal: AbortSignal.timeout(60_000),
    });
    const text = await response.text();
    return { ok: response.ok, status: response.status, text };
  } catch (err) {
    console.log(`elastic_error name ${err?.name || "Error"}`);
    return { ok: false, status: 0, text: "" };
  }
}
