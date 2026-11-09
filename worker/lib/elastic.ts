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
  options?: { allowNotFound?: boolean; timeoutMs?: number },
): Promise<T> {
  if (!env.ELASTIC_URL || !env.ELASTIC_API_KEY) {
    throw new HttpError(503, "upstream", "Elastic is not configured");
  }
  let res: Response;
  try {
    res = await fetch(new URL(path, env.ELASTIC_URL), {
      method,
      headers: {
        authorization: `ApiKey ${env.ELASTIC_API_KEY}`,
        "content-type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal:
        options?.timeoutMs !== undefined ? AbortSignal.timeout(Math.max(1, options.timeoutMs)) : undefined,
    });
  } catch {
    console.error("elastic_error", { method, status: 0 });
    throw new HttpError(504, "upstream", "Elastic request failed");
  }
  if (!res.ok) {
    await res.body?.cancel();
    if (options?.allowNotFound && res.status === 404) return { found: false } as T;
    // Log status only. Response bodies can echo attendee text.
    console.error("elastic_error", { method, status: res.status });
    throw new HttpError(502, "upstream", `Elastic returned ${res.status}`);
  }
  if (method === "HEAD" || res.status === 204) {
    await res.body?.cancel();
    return undefined as T;
  }
  return (await res.json()) as T;
}

export function getDoc<T>(env: Env, index: string, id: string) {
  return elastic<{ found: boolean; _source?: T }>(
    env,
    "GET",
    `/${index}/_doc/${encodeURIComponent(id)}`,
    undefined,
    { allowNotFound: true },
  );
}

/** Read-only ping of the shared sessions index. No document body is logged. */
export async function elasticSmoke(env: Env): Promise<{ elastic: "ok" | "error"; elastic_fallback?: string }> {
  if (!env.ELASTIC_URL || !env.ELASTIC_API_KEY) {
    return { elastic: "error", elastic_fallback: "Elastic is not configured" };
  }
  try {
    await elastic(env, "HEAD", `/${env.SESSIONS_INDEX}`);
    return { elastic: "ok" };
  } catch (err) {
    if (err instanceof HttpError) return { elastic: "error", elastic_fallback: err.message };
    console.error("elastic_smoke", { status: "error" });
    return { elastic: "error", elastic_fallback: "Elastic request failed" };
  }
}

export function putDoc<T>(env: Env, index: string, id: string, doc: T) {
  return elastic(env, "PUT", `/${index}/_doc/${encodeURIComponent(id)}`, doc);
}
