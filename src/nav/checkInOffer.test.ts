import { describe, expect, it } from "vitest";
import type { Plan, Session } from "../../shared/types";
import { findCheckInOffer } from "./checkInOffer";

const session: Session = {
  id: "s1",
  title: "Debug day",
  start: "2026-11-10T10:00:00-07:00",
  end: "2026-11-10T10:40:00-07:00",
  room: "Room A",
  track: "SRE",
  speakers: [],
  abstract: "",
  search_text: "",
  speaker_text: "",
};

const plan: Plan = {
  attendee_id: "demo",
  source: "basic",
  updated_at: "2026-11-10T09:00:00-07:00",
  days: {
    "2026-11-10": {
      items: [{ session_id: "s1", status: "planned", reason: "On your goal." }],
      breaks: [],
    },
  },
};

describe("findCheckInOffer", () => {
  it("returns null when nothing has ended", () => {
    const now = new Date("2026-11-10T09:30:00-07:00");
    expect(findCheckInOffer(now, plan, [session])).toBeNull();
  });

  it("offers check-in after a planned session ends", () => {
    const now = new Date("2026-11-10T11:00:00-07:00");
    expect(findCheckInOffer(now, plan, [session])).toEqual({
      sessionId: "s1",
      sessionTitle: "Debug day",
      sessionTime: "10:00 AM–10:40 AM",
      sessionRoom: "Room A",
    });
  });

  it("skips sessions already marked done", () => {
    const donePlan: Plan = {
      ...plan,
      days: {
        "2026-11-10": {
          items: [{ session_id: "s1", status: "done", reason: "On your goal." }],
          breaks: [],
        },
      },
    };
    const now = new Date("2026-11-10T11:00:00-07:00");
    expect(findCheckInOffer(now, donePlan, [session])).toBeNull();
  });
});
