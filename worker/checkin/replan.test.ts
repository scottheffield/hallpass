import { describe, expect, it } from "vitest";
import type { Profile } from "../../shared/types";
import { fixtureProfile } from "../lib/fixtures";
import { adjustDayAfterCheckin } from "./replan";
import { diffPlanDay, type PlanDay } from "./diff";

const profile: Profile = {
  attendee_id: "test-attendee",
  why_summary: "test",
  goals: ["learn k8s"],
  role: "platform",
  problems: [],
  topics: [],
  tools: [],
  people_to_see: [],
  expertise_to_see: [],
  energy: "medium",
  pacing: "balanced",
  breaks: "lunch",
  updated_at: "2026-11-10T09:00:00-07:00",
};

const day: PlanDay = {
  items: [
    { session_id: "first", status: "planned", reason: "first" },
    { session_id: "second", status: "planned", reason: "second" },
  ],
  breaks: [],
};

describe("adjustDayAfterCheckin", () => {
  it("does not drop a planned item when the checked-in session is not on the day", () => {
    const next = adjustDayAfterCheckin(profile, "2026-11-10", day, "2026-11-10T11:00:00-07:00", {
      session_id: "off-plan-session",
      worth_it: "no",
      moved_goal: "no",
    });
    expect(next.items).toEqual(day.items);
  });

  it("swaps the next session for the same goal instead of dropping an unrelated talk", () => {
    const demoProfile = fixtureProfile("swap-test");
    const before: PlanDay = {
      items: [
        {
          session_id: "1246200",
          status: "done",
          reason:
            "End-user session on putting AI where people already ask questions: namespace status, and where on-call should look first.",
        },
        {
          session_id: "1250865",
          status: "planned",
          reason:
            "A year of operating cache-aware LLM inference on Kubernetes, including cache-hit cliffs and the cost of cascading small and large models.",
        },
        {
          session_id: "1250770",
          status: "planned",
          reason:
            "SREs describe AI incident response stalling on missing context: a recent deploy, an owner change, an upstream dependency.",
          beat_alternative: { session_id: "1244963", why: "Same slot with more incident context." },
        },
      ],
      breaks: [],
    };
    const after = adjustDayAfterCheckin(demoProfile, "2026-11-10", before, "2026-11-10T12:05:00-07:00", {
      session_id: "1246200",
      worth_it: "mixed",
      moved_goal: "no",
    });
    expect(after.items.some((item) => item.session_id === "1250865")).toBe(false);
    expect(after.items.some((item) => item.session_id === "1250770")).toBe(true);
    expect(after.items.length).toBe(before.items.length);
    const changes = diffPlanDay(before, after, {
      signal: { session_id: "1246200", worth_it: "mixed", moved_goal: "no" },
    });
    const moved = changes.find((change) => change.kind === "moved");
    expect(moved?.text).toMatch(/^Swapped in /);
    expect(changes.some((change) => change.kind === "removed" && change.session_id === "1250770")).toBe(false);
  });
});
