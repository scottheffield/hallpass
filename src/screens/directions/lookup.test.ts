import { describe, expect, it } from "vitest";
import type { Room } from "../../../shared/types";
import {
  accessNeedsMentionStepFree,
  buildDirectionsContent,
  findRoomByName,
  shouldShowStepFreeHint,
} from "./lookup";

const SAMPLE_ROOMS: Room[] = [
  {
    name: "Salt Palace | Level 1 | Grand Ballroom H",
    level: "Level 1",
    landmark: "Grand Ballroom",
    walking_hint:
      "From the 200 South entrance, cross the south foyer into the Grand Ballroom on Level 1. Section H is in that ballroom.",
    step_free_hint: "Use marked elevators. Confirm the path at an Info Desk.",
  },
  {
    name: "Salt Palace | Level 2 | 250 A-C",
    level: "Level 2",
    landmark: "250 A-C",
    walking_hint: "",
  },
];

describe("directions lookup", () => {
  it("finds a room by exact session.room name", () => {
    expect(findRoomByName(SAMPLE_ROOMS, "Salt Palace | Level 1 | Grand Ballroom H")?.level).toBe(
      "Level 1",
    );
    expect(findRoomByName(SAMPLE_ROOMS, "Missing")).toBeUndefined();
  });

  it("returns walking text and step-free when the hint exists", () => {
    const content = buildDirectionsContent(SAMPLE_ROOMS, "Salt Palace | Level 1 | Grand Ballroom H");
    expect(content.hasWalkingHint).toBe(true);
    expect(content.walkingText).toContain("200 South entrance");
    expect(content.stepFreeText).toContain("elevators");
  });

  it("hides step-free when access needs are set but do not mention step-free", () => {
    const content = buildDirectionsContent(
      SAMPLE_ROOMS,
      "Salt Palace | Level 1 | Grand Ballroom H",
      "Quiet room between sessions",
    );
    expect(content.stepFreeText).toBeUndefined();
    expect(shouldShowStepFreeHint(findRoomByName(SAMPLE_ROOMS, "Salt Palace | Level 1 | Grand Ballroom H"), "Quiet room")).toBe(
      false,
    );
  });

  it("shows step-free when access needs mention step-free", () => {
    expect(accessNeedsMentionStepFree("Need a step-free path")).toBe(true);
    const content = buildDirectionsContent(
      SAMPLE_ROOMS,
      "Salt Palace | Level 1 | Grand Ballroom H",
      "Need a step-free path",
    );
    expect(content.stepFreeText).toBeDefined();
  });

  it("falls back when walking_hint is empty", () => {
    const content = buildDirectionsContent(SAMPLE_ROOMS, "Salt Palace | Level 2 | 250 A-C");
    expect(content.hasWalkingHint).toBe(false);
    expect(content.walkingText).toContain("No written walking directions");
    expect(content.level).toBe("Level 2");
  });

  it("handles unknown rooms", () => {
    const content = buildDirectionsContent(SAMPLE_ROOMS, "Not a listed room");
    expect(content.knownRoom).toBe(false);
    expect(content.walkingText).toContain("not in the venue list");
  });
});
