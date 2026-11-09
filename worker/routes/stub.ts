import { apiError } from "../lib/http";

/** Placeholder for a slice that hasn't landed yet. Replace the route's handler in its own file. */
export function notImplemented(slice: string) {
  return async (): Promise<Response> => apiError("not_implemented", `${slice} is not built yet`, 501);
}
