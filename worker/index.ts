import { ATTENDEE_HEADER } from "../shared/types";
import type { Env } from "./env";
import { apiError, HttpError } from "./lib/http";
import { agent } from "./routes/agent";
import { caseForAttending } from "./routes/case";
import { applyProposal, checkin } from "./routes/checkin";
import { leaveSession } from "./routes/leave";
import { demoLoad } from "./routes/demo";
import { health } from "./routes/health";
import { insights } from "./routes/insights";
import { interview } from "./routes/interview";
import { planEdit, planGenerate, planGet } from "./routes/plan";
import { profileGet, profileSave } from "./routes/profile";
import { readout } from "./routes/readout";

type Handler = (request: Request, env: Env, ctx: ExecutionContext, attendeeId: string) => Promise<Response>;

/**
 * Route table. Each slice owns its handler file and replaces the stub in that file.
 * This table stays put so slices do not edit it. Attendee text is POST-only.
 */
const routes: Record<string, Handler> = {
  "POST /api/interview": interview,
  "POST /api/profile": profileSave,
  "POST /api/profile/get": profileGet,
  "POST /api/plan": planGenerate,
  "POST /api/plan/get": planGet,
  "POST /api/plan/edit": planEdit,
  "POST /api/checkin": checkin,
  "POST /api/session/leave": leaveSession,
  "POST /api/plan/apply": applyProposal,
  "POST /api/case": caseForAttending,
  "POST /api/readout": readout,
  "POST /api/agent": agent,
  "GET /api/insights": insights,
  "POST /api/demo/load": demoLoad,
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
