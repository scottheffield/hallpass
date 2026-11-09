import type { ApiError } from "../../shared/types";

/** Request bodies above this are rejected before parsing. */
export const MAX_BODY_BYTES = 32 * 1024;

export function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
}

export function apiError(code: ApiError["code"], error: string, status: number): Response {
  const body: ApiError = { code, error };
  return json(body, status);
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiError["code"],
    message: string,
  ) {
    super(message);
  }
}

/**
 * Reads a request body with a hard byte limit. Use this instead of request.json(),
 * because the browser controls what it sends.
 */
export async function readLimitedText(request: Request, maxBytes = MAX_BODY_BYTES): Promise<string> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > maxBytes) throw new HttpError(413, "too_large", "Request body too large");
  if (!request.body) return "";

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new HttpError(413, "too_large", "Request body too large");
    }
    chunks.push(value);
  }
  const all = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    all.set(c, offset);
    offset += c.byteLength;
  }
  return new TextDecoder().decode(all);
}

export async function readLimitedJson<T>(request: Request, maxBytes = MAX_BODY_BYTES): Promise<T> {
  const text = await readLimitedText(request, maxBytes);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new HttpError(400, "bad_request", "Body must be JSON");
  }
}
