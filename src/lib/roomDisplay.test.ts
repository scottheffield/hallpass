import { describe, expect, it } from "vitest";
import { formatRoomDisplay } from "./roomDisplay";

describe("formatRoomDisplay", () => {
  it("formats a three-part Salt Palace name room-first", () => {
    expect(formatRoomDisplay("Salt Palace | Level 1 | Grand Ballroom H")).toBe(
      "Grand Ballroom H · Level 1 · Salt Palace",
    );
    expect(formatRoomDisplay("Salt Palace | Level 2 | 255 BC")).toBe("255 BC · Level 2 · Salt Palace");
  });

  it("formats a longer Solutions Showcase name", () => {
    const name =
      "Salt Palace | Level 1 | Solutions Showcase | Hall 1 | Alpine Overlook Zone | Demo Theater";
    expect(formatRoomDisplay(name)).toBe(
      "Solutions Showcase › Hall 1 › Alpine Overlook Zone › Demo Theater · Level 1 · Salt Palace",
    );
  });

  it("shows Hyatt Regency Lobby as room and building", () => {
    expect(formatRoomDisplay("Hyatt Regency Lobby")).toBe("Lobby · Hyatt Regency");
  });

  it("shows Off-Site Location as-is", () => {
    expect(formatRoomDisplay("Off-Site Location")).toBe("Off-Site Location");
  });

  it("shows unrecognized names as-is", () => {
    expect(formatRoomDisplay("Mystery Venue")).toBe("Mystery Venue");
  });

  it("trims whitespace", () => {
    expect(formatRoomDisplay("  Salt Palace | Level 1 | 151  ")).toBe("151 · Level 1 · Salt Palace");
  });
});
