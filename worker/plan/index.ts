import type { MovedGoal, Plan, Profile, WorthIt } from "../../shared/types";
import { fixturePlan } from "../lib/fixtures";

export type PlanDay = Plan["days"][string];

/** What check-in learned. A "no" on moved_goal steers the real replan away from that topic. */
export interface ReplanSignal {
  session_id: string;
  worth_it: WorthIt;
  moved_goal: MovedGoal;
  note?: string;
}

function cloneDay(day: PlanDay | undefined): PlanDay {
  if (!day) return { items: [], breaks: [] };
  return structuredClone(day);
}

/**
 * Stub. Returns the illustrative plan for `day`, unchanged.
 * The Plan slice replaces this body. The signature stays.
 */
export function generateDay(profile: Profile, day: string): PlanDay {
  void profile;
  return cloneDay(fixturePlan("fixture").days[day]);
}

/**
 * Stub. Returns the illustrative day when that fixture exists, otherwise the
 * current day unchanged. Check-in calls this and diffs the result.
 * The Plan slice replaces the body. Keep this signature.
 */
export function replanDay(profile: Profile, plan: Plan, day: string, from: string, signal: ReplanSignal): PlanDay {
  void profile;
  void from;
  void signal;
  return cloneDay(fixturePlan("fixture").days[day] ?? plan.days[day]);
}
