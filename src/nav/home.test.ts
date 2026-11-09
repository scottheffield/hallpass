import { describe, expect, it } from "vitest";
import type { Profile } from "../../shared/types";
import { pickHomeTab, pickInitialPlace } from "./home";

const profile: Profile = {
  attendee_id: "demo",
  why_summary: "Learn",
  goals: ["Debug faster"],
  role: "SRE",
  problems: [],
  topics: [],
  tools: [],
  people_to_see: [],
  expertise_to_see: [],
  energy: "medium",
  pacing: "balanced",
  breaks: "Lunch",
  updated_at: "2026-11-01T12:00:00-07:00",
};

describe("pickInitialPlace", () => {
  it("sends new attendees to intake", () => {
    expect(pickInitialPlace(null)).toBe("entry");
  });

  it("sends returning attendees to today", () => {
    expect(pickInitialPlace(profile)).toBe("today");
  });
});

describe("pickHomeTab", () => {
  it("defaults to today on conference days", () => {
    const now = new Date("2026-11-10T10:00:00-07:00");
    expect(pickHomeTab(now, profile)).toBe("today");
  });

  it("suggests plan before the event", () => {
    const now = new Date("2026-11-01T10:00:00-07:00");
    expect(pickHomeTab(now, profile)).toBe("plan");
  });
});
