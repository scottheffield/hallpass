import { describe, expect, it } from "vitest";
import type { Room } from "../../shared/types";
import { roomForName } from "./rooms";

const aceRoom: Room = {
  name: "Salt Palace | Level 1 | Grand Ballroom ACE",
  level: "Level 1",
  landmark: "Grand Ballroom",
  walking_hint:
    "From the 200 South entrance, cross the south foyer into the Grand Ballroom on Level 1. Section ACE is in that ballroom. Follow the ACE signs.",
};

describe("roomForName", () => {
  it("finds Grand Ballroom ACE from the full agenda path", () => {
    const hit = roomForName([aceRoom], "Salt Palace | Level 1 | Grand Ballroom ACE");
    expect(hit?.walking_hint).toContain("ACE signs");
  });

  it("matches when the agenda path has trailing whitespace", () => {
    const hit = roomForName([aceRoom], "Salt Palace | Level 1 | Grand Ballroom ACE ");
    expect(hit?.name).toBe(aceRoom.name);
  });

  it("returns null when the room is not listed", () => {
    expect(roomForName([aceRoom], "Salt Palace | Level 2 | 999")).toBeNull();
  });
});
