import type { CaseResponse } from "../../shared/api";
import type { Env } from "../env";
import { fixturePlan, fixtureProfile } from "../lib/fixtures";
import { json } from "../lib/http";
import { readObject } from "./body";

/** Stub case. Session ids come from the illustrative plan, not from model text. */
export async function caseForAttending(request: Request, env: Env, ctx: ExecutionContext, attendeeId: string): Promise<Response> {
  void env;
  void ctx;
  await readObject(request);
  const profile = fixtureProfile(attendeeId);
  const plan = fixturePlan(attendeeId);
  const sessions = Object.values(plan.days).flatMap((day) => day.items.map((item) => item.session_id));
  const response: CaseResponse = {
    stub: true,
    case: {
      attendee_id: attendeeId,
      problems: profile.problems,
      sessions,
      bring_back: [
        "A way to walk a Kubernetes incident from the first alert to the cause.",
        "The decisions a platform team makes to serve inference next to existing services.",
      ],
      text: "Illustrative case. Alex wants practical ways to diagnose Kubernetes incidents faster, and a look at how platform teams serve AI inference. The plan includes Debugging a Kubernetes incident and Serving inference on a platform. This is sample copy, not a model summary.",
    },
  };
  return json(response);
}
