import { describe, expect, it } from "vitest";
import { showShellTabs } from "./tabs";

describe("showShellTabs", () => {
  it("shows tabs on the three primary destinations", () => {
    expect(showShellTabs("today")).toBe(true);
    expect(showShellTabs("plan")).toBe(true);
    expect(showShellTabs("goals")).toBe(true);
  });

  it("hides tabs on intake, directions, and auxiliary screens", () => {
    expect(showShellTabs("entry")).toBe(false);
    expect(showShellTabs("directions")).toBe(false);
    expect(showShellTabs("case")).toBe(false);
    expect(showShellTabs("readout")).toBe(false);
    expect(showShellTabs("insights")).toBe(false);
  });
});
