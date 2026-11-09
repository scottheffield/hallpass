import { describe, expect, it } from "vitest";
import type { AgentMessage } from "../../shared/api";
import type { AgentContext, PlanRow } from "./context";
import type { Room } from "../../shared/types";
import { fallbackAnswer } from "./fallback";

const grandBallroom: Room = {
  name: "Salt Palace | Level 1 | Grand Ballroom H",
  level: "Level 1",
  landmark: "Grand Ballroom H",
  walking_hint: "East escalators from Hall DE.",
};

const room151: Room = {
  name: "Salt Palace | Level 1 | 151",
  level: "Level 1",
  landmark: "Room 151",
  walking_hint: "South foyer, north side of Level 1.",
};

const rooms = [grandBallroom, room151];

const nextRow: PlanRow = {
  session_id: "1250865",
  title: "Cache-Aware LLM Inference",
  start: "2026-11-10T12:20:00-07:00",
  end: "2026-11-10T12:50:00-07:00",
  room: grandBallroom.name,
  reason: "Inference on Kubernetes.",
};

const laterRow: PlanRow = {
  session_id: "1250770",
  title: "AI Incident Response",
  start: "2026-11-10T15:40:00-07:00",
  end: "2026-11-10T16:10:00-07:00",
  room: "Salt Palace | Level 1 | Grand Ballroom ACE",
  reason: "SRE context gaps.",
};

function user(content: string): AgentMessage[] {
  return [{ role: "user", content }];
}

function ctx(overrides: Partial<AgentContext> = {}): AgentContext {
  return {
    nowIso: "2026-11-10T12:05:00-07:00",
    day: "2026-11-10",
    goals: ["Debug incidents"],
    remaining: [nextRow, laterRow],
    next: nextRow,
    nextRoom: grandBallroom,
    ...overrides,
  };
}

describe("fallbackAnswer", () => {
  it("returns empty-plan copy when nothing remains today", () => {
    const answer = fallbackAnswer(ctx({ next: null, remaining: [], nextRoom: null }), user("what is next?"), rooms);
    expect(answer).toContain("No sessions left");
  });

  it("answers next-session questions from the plan", () => {
    const answer = fallbackAnswer(ctx(), user("what is next?"), rooms);
    expect(answer).toContain("Grand Ballroom H");
    expect(answer).toContain("12:20 PM");
    expect(answer).toContain("Cache-Aware");
  });

  it("lists remaining sessions when the question is open-ended", () => {
    const answer = fallbackAnswer(
      ctx(),
      user("Can you walk me through everything I still have on my calendar for this afternoon including breaks?"),
      rooms,
    );
    expect(answer).toContain("Still on your plan today");
    expect(answer).toContain("Grand Ballroom H");
    expect(answer).toContain("3:40 PM");
  });

  it("uses directions for a named room instead of the next session room", () => {
    const answer = fallbackAnswer(ctx(), user("Where is room 151?"), rooms);
    expect(answer).toContain("151");
    expect(answer).toContain("South foyer");
    expect(answer).not.toContain("escalators");
  });

  it("falls back to the next session room when directions lack a named match", () => {
    const answer = fallbackAnswer(ctx(), user("How do I get there?"), rooms);
    expect(answer).toContain("Grand Ballroom H");
    expect(answer).toContain("escalators");
  });
});
