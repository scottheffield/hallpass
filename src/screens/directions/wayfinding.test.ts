import { describe, expect, it } from "vitest";
import type { PlanItem, Session } from "../../../shared/types";
import {
  buildFromPreviousLine,
  formatRoomHeading,
  floorImageAlt,
  NOT_ON_SALT_PALACE_PLAN,
  pickFloorLevel,
  previousRoomForDirections,
  shouldShowSaltPalacePlan,
} from "./wayfinding";

const LEVELS = [
  {
    building: "Salt Palace",
    level: "Level 1",
    image: "/floor/salt-palace-level-1.webp",
    alt: "Salt Palace Level 1 map.",
  },
  {
    building: "Salt Palace",
    level: "Level 2",
    image: "/floor/salt-palace-level-2.webp",
    alt: "Salt Palace Level 2 map.",
  },
];

describe("formatRoomHeading", () => {
  it("formats a three-part Salt Palace name", () => {
    expect(formatRoomHeading("Salt Palace | Level 2 | 255 BC")).toBe(
      "Salt Palace › Level 2 › 255 BC",
    );
  });

  it("formats a longer Solutions Showcase name", () => {
    const name =
      "Salt Palace | Level 1 | Solutions Showcase | Hall 1 | Alpine Overlook Zone | Demo Theater";
    expect(formatRoomHeading(name)).toBe(
      "Salt Palace › Level 1 › Solutions Showcase › Hall 1 › Alpine Overlook Zone › Demo Theater",
    );
  });

  it("shows Hyatt Regency Lobby as building and room", () => {
    expect(formatRoomHeading("Hyatt Regency Lobby")).toBe("Hyatt Regency › Lobby");
  });

  it("shows Off-Site Location as-is", () => {
    expect(formatRoomHeading("Off-Site Location")).toBe("Off-Site Location");
  });

  it("shows unrecognized names as-is", () => {
    expect(formatRoomHeading("Mystery Venue")).toBe("Mystery Venue");
  });
});

describe("buildFromPreviousLine", () => {
  const room151 = "Salt Palace | Level 1 | 151";
  const room250 = "Salt Palace | Level 2 | 250 A-C";
  const hyattBallroom = "Hyatt Regency | Level 4 | Regency Ballroom B";
  const hyattLobby = "Hyatt Regency Lobby";
  const offSite = "Off-Site Location";
  const mystery = "Mystery Venue";

  it("returns undefined with no previous room", () => {
    expect(buildFromPreviousLine(undefined, room250)).toBeUndefined();
    expect(buildFromPreviousLine("  ", room250)).toBeUndefined();
  });

  it("same room", () => {
    expect(buildFromPreviousLine(room151, room151)).toBe("Same room. Stay put.");
  });

  it("same building and level", () => {
    expect(
      buildFromPreviousLine(
        "Salt Palace | Level 1 | Grand Ballroom H",
        "Salt Palace | Level 1 | 151",
      ),
    ).toBe("Same floor. Follow signs to 151.");
  });

  it("same building, different level", () => {
    expect(buildFromPreviousLine(room151, room250)).toBe(
      "Go to Level 2 by the escalators or a marked elevator, then follow signs to 250 A-C.",
    );
  });

  it("Salt Palace to Hyatt", () => {
    expect(buildFromPreviousLine(room151, hyattBallroom)).toBe(
      "Next door in the Hyatt Regency, through the indoor connection. Allow about 12 minutes.",
    );
  });

  it("Hyatt to Salt Palace", () => {
    expect(buildFromPreviousLine(hyattBallroom, room151)).toBe(
      "Next door in the Salt Palace, through the indoor connection. Allow about 12 minutes.",
    );
  });

  it("off-site or unknown", () => {
    expect(buildFromPreviousLine(room151, offSite)).toBe(
      "This room is away from the main venue. Check the session listing and allow extra time.",
    );
    expect(buildFromPreviousLine(offSite, room151)).toBe(
      "This room is away from the main venue. Check the session listing and allow extra time.",
    );
    expect(buildFromPreviousLine(mystery, room151)).toBe(
      "This room is away from the main venue. Check the session listing and allow extra time.",
    );
    expect(buildFromPreviousLine(room151, mystery)).toBe(
      "This room is away from the main venue. Check the session listing and allow extra time.",
    );
  });

  it("Hyatt lobby to Hyatt ballroom counts as a level change", () => {
    expect(buildFromPreviousLine(hyattLobby, hyattBallroom)).toBe(
      "Go to Level 4 by the escalators or a marked elevator, then follow signs to Regency Ballroom B.",
    );
  });

  it("uses follow-signs copy when the target level is unknown", () => {
    expect(buildFromPreviousLine(hyattBallroom, hyattLobby)).toBe("Follow signs to Lobby.");
  });
});

describe("Salt Palace floor plan", () => {
  it("shows plan only for salt-palace rooms", () => {
    expect(shouldShowSaltPalacePlan("Salt Palace | Level 2 | 255 BC")).toBe(true);
    expect(shouldShowSaltPalacePlan("Hyatt Regency Lobby")).toBe(false);
    expect(shouldShowSaltPalacePlan("Off-Site Location")).toBe(false);
    expect(shouldShowSaltPalacePlan("Mystery Venue")).toBe(false);
  });

  it("picks the level image when building and level match", () => {
    const entry = pickFloorLevel("Salt Palace | Level 2 | 250 A-C", LEVELS);
    expect(entry?.image).toBe("/floor/salt-palace-level-2.webp");
    expect(pickFloorLevel("Hyatt Regency Lobby", LEVELS)).toBeUndefined();
  });

  it("builds floor image alt with landmark", () => {
    expect(floorImageAlt("Salt Palace Level 2 map.", "250 A-C")).toContain("250 A-C");
  });

  it("exports the not-on-plan copy", () => {
    expect(NOT_ON_SALT_PALACE_PLAN).toContain("Salt Palace");
  });
});

describe("previousRoomForDirections", () => {
  const sessions: Session[] = [
    {
      id: "s1",
      title: "Morning",
      start: "2026-11-10T10:00:00-07:00",
      end: "2026-11-10T10:40:00-07:00",
      room: "Salt Palace | Level 1 | 151",
      track: "",
      speakers: [],
      abstract: "",
      search_text: "",
      speaker_text: "",
    },
    {
      id: "s2",
      title: "Afternoon",
      start: "2026-11-10T14:00:00-07:00",
      end: "2026-11-10T14:40:00-07:00",
      room: "Salt Palace | Level 2 | 250 A-C",
      track: "",
      speakers: [],
      abstract: "",
      search_text: "",
      speaker_text: "",
    },
  ];

  it("returns undefined when there is no prior session", () => {
    const items: PlanItem[] = [
      { session_id: "s2", status: "planned", reason: "" },
    ];
    expect(previousRoomForDirections(sessions, items, "s2", "2026-11-10T09:00:00-07:00")).toBeUndefined();
  });

  it("returns the last done or past session before the target", () => {
    const items: PlanItem[] = [
      { session_id: "s1", status: "planned", reason: "" },
      { session_id: "s2", status: "planned", reason: "" },
    ];
    expect(
      previousRoomForDirections(sessions, items, "s2", "2026-11-10T11:00:00-07:00"),
    ).toBe("Salt Palace | Level 1 | 151");

    const itemsDone: PlanItem[] = [
      { session_id: "s1", status: "done", reason: "" },
      { session_id: "s2", status: "planned", reason: "" },
    ];
    expect(
      previousRoomForDirections(sessions, itemsDone, "s2", "2026-11-10T09:30:00-07:00"),
    ).toBe("Salt Palace | Level 1 | 151");
  });

  it("ignores skipped sessions even after their end time", () => {
    const items: PlanItem[] = [
      { session_id: "s1", status: "skipped", reason: "" },
      { session_id: "s2", status: "planned", reason: "" },
    ];
    expect(
      previousRoomForDirections(sessions, items, "s2", "2026-11-10T11:00:00-07:00"),
    ).toBeUndefined();
  });
});
