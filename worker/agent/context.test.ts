import { describe, expect, it } from "vitest";
import type { Plan, PlanItem, Profile, Room, Session } from "../../shared/types";
import { buildAgentContext, planRowsForDay, shortRoom } from "./context";
import { roomForName } from "./rooms";

const sessionA: Session = {
  id: "1246200",
  title: "Ask Your Platform",
  start: "2026-11-10T11:30:00-07:00",
  end: "2026-11-10T12:00:00-07:00",
  room: "Salt Palace | Level 1 | Grand Ballroom H",
  track: "AI",
  speakers: [],
  abstract: "",
  search_text: "",
  speaker_text: "",
};

const sessionB: Session = {
  id: "1250865",
  title: "Cache-Aware LLM Inference",
  start: "2026-11-10T12:20:00-07:00",
  end: "2026-11-10T12:50:00-07:00",
  room: "Salt Palace | Level 1 | Grand Ballroom H",
  track: "AI",
  speakers: [],
  abstract: "",
  search_text: "",
  speaker_text: "",
};

const sessions = new Map<string, Session>([
  [sessionA.id, sessionA],
  [sessionB.id, sessionB],
]);

const items: PlanItem[] = [
  { session_id: sessionA.id, status: "planned", reason: "Morning AI session." },
  { session_id: sessionB.id, status: "planned", reason: "Follow-on inference talk." },
];

const profile: Profile = {
  attendee_id: "test",
  why_summary: "Learn inference ops",
  goals: ["Debug production incidents faster"],
  role: "Platform engineer",
  problems: [],
  topics: [],
  tools: [],
  people_to_see: [],
  expertise_to_see: [],
  energy: "medium",
  pacing: "balanced",
  breaks: "Lunch",
  updated_at: "2026-11-10T08:00:00-07:00",
};

const plan: Plan = {
  attendee_id: "test",
  days: { "2026-11-10": { items, breaks: [] } },
  source: "basic",
  updated_at: "2026-11-10T08:00:00-07:00",
};

const grandBallroom: Room = {
  name: "Salt Palace | Level 1 | Grand Ballroom H",
  level: "Level 1",
  landmark: "Grand Ballroom H",
  walking_hint: "East escalators from Hall DE.",
};

describe("planRowsForDay", () => {
  it("picks the next session after the clock passes the first block", () => {
    const atNoon = new Date("2026-11-10T12:05:00-07:00");
    const { remaining, next } = planRowsForDay("2026-11-10", items, sessions, atNoon);
    expect(remaining).toHaveLength(1);
    expect(next?.session_id).toBe(sessionB.id);
  });

  it("returns the first upcoming session before the first block ends", () => {
    const atMorning = new Date("2026-11-10T11:45:00-07:00");
    const { next } = planRowsForDay("2026-11-10", items, sessions, atMorning);
    expect(next?.session_id).toBe(sessionA.id);
  });
});

describe("room hints", () => {
  it("looks up a room by the exact agenda path", () => {
    const hit = roomForName([grandBallroom], sessionA.room);
    expect(hit?.walking_hint).toContain("escalators");
    expect(shortRoom(sessionA.room)).toBe("Grand Ballroom H");
  });
});

describe("buildAgentContext", () => {
  it("includes the next item and room hint for the system prompt", () => {
    const at = new Date("2026-11-10T12:05:00-07:00");
    const ctx = buildAgentContext(at, profile, plan, sessions, [grandBallroom]);
    expect(ctx.next?.title).toBe(sessionB.title);
    expect(ctx.nextRoom?.walking_hint).toContain("escalators");
    expect(ctx.goals[0]).toContain("incidents");
  });
});
