import { ATTENDEE_HEADER } from "../shared/types";
import type { Env } from "./env";
import { apiError, HttpError } from "./lib/http";
import { health } from "./routes/health";
import { notImplemented } from "./routes/stub";

type Handler = (request: Request, env: Env, ctx: ExecutionContext, attendeeId: string) => Promise<Response>;

/**
 * Route table. Each slice owns one handler file in worker/routes/ and swaps its stub here.
 * Everything that carries attendee text is POST, so goals and questions never land in URLs or traces.
 */
const routes: Record<string, Handler> = {
  "POST /api/interview": notImplemented("Interview"),
  "POST /api/profile": notImplemented("Profile save"),
  "POST /api/plan": notImplemented("Plan generation"),
  "POST /api/plan/get": notImplemented("Plan read"),
  "POST /api/checkin": notImplemented("Check-in"),
  "POST /api/case": notImplemented("Case for attending"),
  "POST /api/readout": notImplemented("Readout"),
  "POST /api/agent": notImplemented("Corner agent"),
  "GET /api/insights": notImplemented("Organizer insights"),
};

const ATTENDEE_ID = /^[A-Za-z0-9_-]{8,64}$/;

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);

    if (!url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    try {
      if (request.method === "GET" && url.pathname === "/api/health") {
        return await health(request, env);
      }

      const handler = routes[`${request.method} ${url.pathname}`];
      if (!handler) return apiError("bad_request", "Unknown route", 404);

      const attendeeId = request.headers.get(ATTENDEE_HEADER) ?? "";
      if (!ATTENDEE_ID.test(attendeeId)) {
        return apiError("bad_request", "Missing or invalid attendee ID", 400);
      }

      const { success } = await env.API_LIMITER.limit({ key: attendeeId });
      if (!success) return apiError("rate_limited", "Too many requests. Try again in a minute.", 429);

      return await handler(request, env, ctx, attendeeId);
    } catch (err) {
      if (err instanceof HttpError) return apiError(err.code, err.message, err.status);
      // No request bodies or attendee text in logs.
      console.error("unhandled", { route: url.pathname, name: err instanceof Error ? err.name : "unknown" });
      return apiError("internal", "Something went wrong", 500);
    }
  },
} satisfies ExportedHandler<Env>;
