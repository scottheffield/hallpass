import { describe, expect, it } from "vitest";
import { showShellTabs } from "./tabs";

describe("showShellTabs", () => {
  it("shows tabs on the three primary destinations", () => {
    expect(showShellTabs("today")).toBe(true);
    expect(showShellTabs("plan")).toBe(true);
    expect(showShellTabs("goals")).toBe(true);
  });

  it("shows tabs on directions and focused auxiliary screens", () => {
    expect(showShellTabs("directions")).toBe(true);
    expect(showShellTabs("case")).toBe(true);
    expect(showShellTabs("readout")).toBe(true);
    expect(showShellTabs("insights")).toBe(true);
  });

  it("hides tabs during intake only", () => {
    expect(showShellTabs("entry")).toBe(false);
  });
});
