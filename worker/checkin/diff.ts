import type { PlanBreak, PlanChange, PlanItem } from "../../shared/types";

export type PlanDay = { items: PlanItem[]; breaks: PlanBreak[] };

const MAX_CHANGES = 3;

function plannedIds(day: PlanDay): string[] {
  return day.items.filter((item) => item.status === "planned").map((item) => item.session_id);
}

function breakKey(breakItem: PlanBreak): string {
  return `${breakItem.start}|${breakItem.end}|${breakItem.note}`;
}

function breakSetsEqual(a: PlanBreak[], b: PlanBreak[]): boolean {
  const left = new Set(a.map(breakKey));
  const right = new Set(b.map(breakKey));
  if (left.size !== right.size) return false;
  for (const key of left) {
    if (!right.has(key)) return false;
  }
  return true;
}

/**
 * Pure diff from a day after check-in (done marked) to a proposed replan of the same day.
 * Caps at three bullets. Returns [] when nothing meaningful changed.
 */
export function diffPlanDay(before: PlanDay, after: PlanDay): PlanChange[] {
  if (JSON.stringify(before) === JSON.stringify(after)) return [];

  const changes: PlanChange[] = [];
  const beforePlanned = new Set(plannedIds(before));
  const afterPlanned = new Set(plannedIds(after));

  for (const item of before.items) {
    if (item.status !== "planned") continue;
    if (!afterPlanned.has(item.session_id)) {
      changes.push({
        kind: "removed",
        session_id: item.session_id,
        text: `Dropped a later session (${item.session_id}).`,
      });
    }
  }

  for (const item of after.items) {
    if (item.status !== "planned") continue;
    if (!beforePlanned.has(item.session_id)) {
      changes.push({
        kind: "added",
        session_id: item.session_id,
        text: `Added session ${item.session_id} to the rest of today.`,
      });
    }
  }

  const shared = plannedIds(before).filter((id) => afterPlanned.has(id));
  if (shared.length > 1) {
    const orderBefore = plannedIds(before).filter((id) => shared.includes(id));
    const orderAfter = plannedIds(after).filter((id) => shared.includes(id));
    if (orderBefore.join("\0") !== orderAfter.join("\0")) {
      const moved =
        orderAfter.find((id, index) => orderBefore[index] !== id) ?? orderAfter.find((id) => orderBefore.indexOf(id) !== orderAfter.indexOf(id));
      if (moved) {
        changes.push({
          kind: "moved",
          session_id: moved,
          text: `Moved session ${moved} in today's order.`,
        });
      }
    }
  }

  if (!breakSetsEqual(before.breaks, after.breaks)) {
    changes.push({ kind: "break", text: "Adjusted a break for the rest of today." });
  }

  if (changes.length === 0) return [];
  return changes.slice(0, MAX_CHANGES);
}
