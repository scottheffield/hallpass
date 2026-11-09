import type { ShellPlace } from "./types";

/** Bottom tab bar visibility. Hide during intake only; auxiliary screens keep the bar. */
export function showShellTabs(place: ShellPlace): boolean {
  return place !== "entry";
}
