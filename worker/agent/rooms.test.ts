import { describe, expect, it } from "vitest";
import type { Room } from "../../shared/types";
import type { Env } from "../env";
import { loadRooms, resetRoomsCacheForTests, roomForName } from "./rooms";

const aceRoom: Room = {
  name: "Salt Palace | Level 1 | Grand Ballroom ACE",
  level: "Level 1",
  landmark: "Grand Ballroom",
  walking_hint:
    "From the 200 South entrance, cross the south foyer into the Grand Ballroom on Level 1. Section ACE is in that ballroom. Follow the ACE signs.",
};

const roomsJsonBody = [aceRoom];

describe("roomForName", () => {
  it("matches a short room label to the full rooms.json path", () => {
    const hit = roomForName([aceRoom], "Grand Ballroom ACE");
    expect(hit?.walking_hint).toContain("ACE signs");
  });

  it("does not match a different short label on the same level", () => {
    expect(roomForName([aceRoom], "Grand Ballroom H")).toBeNull();
  });

  it("returns null when the room is not listed", () => {
    expect(roomForName([aceRoom], "Salt Palace | Level 2 | 999")).toBeNull();
  });
});

describe("loadRooms", () => {
  it("does not cache a failed fetch and succeeds on retry", async () => {
    resetRoomsCacheForTests();
    let calls = 0;
    const env = {
      ASSETS: {
        fetch: async () => {
          calls += 1;
          if (calls === 1) {
            return new Response("error", { status: 502 });
          }
          return new Response(JSON.stringify(roomsJsonBody), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        },
      },
    } as unknown as Env;

    const first = await loadRooms(env);
    expect(first).toEqual([]);
    expect(calls).toBe(1);

    const second = await loadRooms(env);
    expect(second).toHaveLength(1);
    expect(calls).toBe(2);

    const hit = roomForName(second, "Salt Palace | Level 1 | Grand Ballroom ACE");
    expect(hit?.walking_hint).toContain("ACE signs");

    resetRoomsCacheForTests();
  });
});
