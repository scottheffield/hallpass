import type { ReadoutResponse } from "../../shared/api";
import type { Env } from "../env";
import { json } from "../lib/http";
import { readObject } from "./body";

/** Stub readout. No check-ins yet, so it does not claim a goal was hit. */
export async function readout(request: Request, env: Env, ctx: ExecutionContext, attendeeId: string): Promise<Response> {
  void env;
  void ctx;
  await readObject(request);
  const response: ReadoutResponse = {
    stub: true,
    readout: {
      attendee_id: attendeeId,
      as_of: "2026-11-10T18:00:00-07:00",
      final: false,
      goals_hit: [],
      goals_missed: [],
      helped_sessions: [],
      gaps: ["Not enough feedback to tell"],
      gap_themes: [],
      followups: ["Check in after Debugging a Kubernetes incident in 251 A-C."],
    },
  };
  return json(response);
}
