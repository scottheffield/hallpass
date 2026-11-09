import { describe, expect, it } from "vitest";
import type { Profile } from "../../shared/types";
import { pickHomeShell, pickHomeTab, pickInitialPlace } from "./home";

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

describe("pickHomeShell", () => {
  it("maps the home tab to the same place", () => {
    const before = new Date("2026-11-01T10:00:00-07:00");
    expect(pickHomeShell(before, profile)).toEqual({ tab: "plan", place: "plan" });

    const during = new Date("2026-11-10T10:00:00-07:00");
    expect(pickHomeShell(during, profile)).toEqual({ tab: "today", place: "today" });
  });

  it("keeps new attendees on intake", () => {
    const now = new Date("2026-11-10T10:00:00-07:00");
    expect(pickHomeShell(now, null)).toEqual({ tab: "today", place: "entry" });
  });
});
