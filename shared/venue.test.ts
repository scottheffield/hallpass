import { describe, expect, it } from "vitest";
import { LEVEL_UNKNOWN, parseRoom, transferMinutes } from "./venue";

describe("parseRoom", () => {
  it("parses a three-part Salt Palace name", () => {
    expect(parseRoom("Salt Palace | Level 2 | 255 BC")).toEqual({
      building: "Salt Palace",
      level: "Level 2",
      room: "255 BC",
      kind: "salt-palace",
    });
  });

  it("parses a longer Solutions Showcase name with many segments", () => {
    const name =
      "Salt Palace | Level 1 | Solutions Showcase | Hall 1 | Alpine Overlook Zone | Demo Theater";
    expect(parseRoom(name)).toEqual({
      building: "Salt Palace",
      level: "Level 1",
      room: "Solutions Showcase › Hall 1 › Alpine Overlook Zone › Demo Theater",
      kind: "salt-palace",
    });
  });

  it("parses Hyatt Regency Lobby without pipes", () => {
    expect(parseRoom("Hyatt Regency Lobby")).toEqual({
      building: "Hyatt Regency",
      level: LEVEL_UNKNOWN,
      room: "Lobby",
      kind: "hyatt",
    });
  });

  it("parses Off-Site Location", () => {
    expect(parseRoom("Off-Site Location")).toEqual({
      building: "",
      level: LEVEL_UNKNOWN,
      room: "Off-Site Location",
      kind: "off-site",
    });
  });

  it("treats unrecognized names without pipes as unknown", () => {
    expect(parseRoom("Mystery Venue")).toEqual({
      building: "",
      level: LEVEL_UNKNOWN,
      room: "Mystery Venue",
      kind: "unknown",
    });
  });

  it("classifies Hyatt Regency pipe names", () => {
    expect(parseRoom("Hyatt Regency | Level 4 | Regency Ballroom B").kind).toBe("hyatt");
  });
});

describe("transferMinutes", () => {
  const room151 = "Salt Palace | Level 1 | 151";
  const room250 = "Salt Palace | Level 2 | 250 A-C";
  const hyattBallroom = "Hyatt Regency | Level 4 | Regency Ballroom B";
  const hyattLobby = "Hyatt Regency Lobby";
  const offSite = "Off-Site Location";
  const mystery = "Mystery Venue";

  it("returns 0 for the same room string", () => {
    expect(transferMinutes(room151, room151)).toBe(0);
  });

  it("returns 5 for the same building and level", () => {
    expect(
      transferMinutes(
        "Salt Palace | Level 1 | Grand Ballroom H",
        "Salt Palace | Level 1 | 151",
      ),
    ).toBe(5);
  });

  it("returns 8 for the same building with a different level", () => {
    expect(transferMinutes(room151, room250)).toBe(8);
  });

  it("returns 8 when one side has an unknown level in the same building", () => {
    expect(transferMinutes(hyattLobby, hyattBallroom)).toBe(8);
  });

  it("returns 12 between different buildings", () => {
    expect(transferMinutes(room151, hyattBallroom)).toBe(12);
    expect(transferMinutes(hyattBallroom, room151)).toBe(12);
  });

  it("returns 30 when either side is off-site", () => {
    expect(transferMinutes(room151, offSite)).toBe(30);
    expect(transferMinutes(offSite, hyattBallroom)).toBe(30);
  });

  it("returns 30 for off-site to off-site, not same room", () => {
    expect(transferMinutes(offSite, offSite)).toBe(30);
  });

  it("returns 12 for empty names, not same room", () => {
    expect(transferMinutes("", "")).toBe(12);
    expect(transferMinutes("  ", "  ")).toBe(12);
    expect(transferMinutes("", room151)).toBe(12);
  });

  it("returns 12 when either side is an unknown room", () => {
    expect(transferMinutes(room151, mystery)).toBe(12);
    expect(transferMinutes(mystery, room151)).toBe(12);
  });
});
