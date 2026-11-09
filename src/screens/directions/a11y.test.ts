import { describe, expect, it } from "vitest";
import {
  DIRECTIONS_LINK_FOCUS,
  FLOOR_MAP_UNAVAILABLE,
  FROM_PREVIOUS_SESSION_LABEL,
  SUPPLEMENTARY_MAP_NOTE,
  WALKING_DIRECTIONS_LABEL,
} from "./a11y";

describe("directions a11y copy", () => {
  it("labels the from-previous and walking lines in plain text", () => {
    expect(FROM_PREVIOUS_SESSION_LABEL.length).toBeGreaterThan(5);
    expect(WALKING_DIRECTIONS_LABEL.length).toBeGreaterThan(5);
  });

  it("states that the floor image is supplementary", () => {
    expect(SUPPLEMENTARY_MAP_NOTE).toMatch(/optional/i);
    expect(SUPPLEMENTARY_MAP_NOTE).toMatch(/text directions/i);
  });

  it("explains unavailable maps without relying on styling", () => {
    expect(FLOOR_MAP_UNAVAILABLE).toContain("walking route");
  });

  it("exposes a visible focus treatment for links", () => {
    expect(DIRECTIONS_LINK_FOCUS).toContain("focus-visible:ring");
  });
});
