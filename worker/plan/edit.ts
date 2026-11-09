import type { Plan, PlanChange, Session } from "../../shared/types";
import { overlaps } from "../lib/agenda";
import type { PlanCandidate } from "./candidates";
import { sessionById } from "./agenda-cache";

function itemTitle(sessionId: string): string {
  return sessionById(sessionId)?.title ?? sessionId;
}

export function applyPlanEdit(
  plan: Plan,
  day: string,
  sessionId: string,
  action: "pin" | "drop" | "swap",
  candidates: PlanCandidate[],
): { plan: Plan; changes: PlanChange[] } {
  const body = plan.days[day] ?? { items: [], breaks: [] };
  const items = [...body.items];
  const index = items.findIndex((item) => item.session_id === sessionId);
  const changes: PlanChange[] = [];

  if (action === "pin") {
    if (index < 0) throw new Error("Session is not on this day.");
    items[index] = { ...items[index], pinned: true };
    changes.push({ kind: "moved", session_id: sessionId, text: `Pinned ${itemTitle(sessionId)}.` });
  } else if (action === "drop") {
    if (index < 0) throw new Error("Session is not on this day.");
    const dropped = items.splice(index, 1)[0];
  void dropped;
    changes.push({ kind: "removed", session_id: sessionId, text: `Removed ${itemTitle(sessionId)} from the plan.` });
  } else {
    if (index < 0) throw new Error("Session is not on this day.");
    const current = sessionById(sessionId);
    if (!current) throw new Error("Session is not in the agenda.");
    const scheduled: Session[] = items
      .filter((_, i) => i !== index)
      .map((item) => sessionById(item.session_id))
      .filter((session): session is Session => Boolean(session));
    const replacement = candidates
      .map((row) => row.session)
      .find((session) => session.id !== sessionId && !scheduled.some((other) => overlaps(session, other)));
    if (!replacement) throw new Error("No swap candidate without an overlap.");
    const previous = items[index];
    items[index] = {
      ...previous,
      session_id: replacement.id,
      reason: `Swapped in ${replacement.title} for ${current.title}. ${previous.reason}`,
    };
    changes.push({
      kind: "moved",
      session_id: replacement.id,
      text: `Swapped ${itemTitle(sessionId)} for ${replacement.title}.`,
    });
  }

  const next: Plan = structuredClone(plan);
  next.days[day] = { ...body, items };
  return { plan: next, changes };
}
