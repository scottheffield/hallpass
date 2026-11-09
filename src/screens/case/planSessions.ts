import type { Plan } from "../../../shared/types";

/** First plan reason for each session id, in day order. */
export function planReasonBySessionId(plan: Plan | null): Map<string, string> {
  const out = new Map<string, string>();
  if (!plan) return out;
  for (const dayKey of Object.keys(plan.days).sort()) {
    const day = plan.days[dayKey];
    if (!day) continue;
    for (const item of day.items) {
      if (!out.has(item.session_id)) out.set(item.session_id, item.reason);
    }
  }
  return out;
}

export function reasonForCaseSession(
  sessionId: string,
  reasons: ReadonlyMap<string, string>,
): string | undefined {
  const reason = reasons.get(sessionId)?.trim();
  return reason && reason.length > 0 ? reason : undefined;
}
