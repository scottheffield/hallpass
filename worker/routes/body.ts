import { HttpError, readLimitedJson } from "../lib/http";

/** POST body as an object. Attendee text stays in the body and is not logged. */
export async function readObject(request: Request): Promise<Record<string, unknown>> {
  const value = await readLimitedJson<unknown>(request);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, "bad_request", "Body must be a JSON object");
  }
  return value as Record<string, unknown>;
}
