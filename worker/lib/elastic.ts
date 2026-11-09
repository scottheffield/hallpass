import type { Env } from "../env";
import { HttpError } from "./http";

/** Index names. Agents writing test data set their own prefix in ELASTIC_INDEX_PREFIX. */
export function indexName(env: Env, kind: "sessions" | "profiles" | "plans" | "checkins" | "readouts" | "cases"): string {
  return `${env.ELASTIC_INDEX_PREFIX}-${kind}`;
}

/**
 * Minimal Elastic REST client over fetch. Server side only: never call Elastic from the browser.
 * Read by ID right after a write, because search can lag behind a write.
 */
export async function elastic<T = unknown>(
  env: Env,
  method: "GET" | "POST" | "PUT" | "DELETE" | "HEAD",
  path: string,
  body?: unknown,
): Promise<T> {
  if (!env.ELASTIC_URL || !env.ELASTIC_API_KEY) {
    throw new HttpError(503, "upstream", "Elastic is not configured");
  }
  const res = await fetch(new URL(path, env.ELASTIC_URL), {
    method,
    headers: {
      authorization: `ApiKey ${env.ELASTIC_API_KEY}`,
      "content-type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    // Log status only. Response bodies can echo attendee text.
    console.error("elastic_error", { method, status: res.status });
    throw new HttpError(502, "upstream", `Elastic returned ${res.status}`);
  }
  if (method === "HEAD" || res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function getDoc<T>(env: Env, index: string, id: string) {
  return elastic<{ found: boolean; _source?: T }>(env, "GET", `/${index}/_doc/${encodeURIComponent(id)}`);
}

export function putDoc<T>(env: Env, index: string, id: string, doc: T) {
  return elastic(env, "PUT", `/${index}/_doc/${encodeURIComponent(id)}`, doc);
}
