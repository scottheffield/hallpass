import type { ShellPlace } from "./types";

/** Bottom tab bar visibility. Hide on intake and full-screen directions. */
export function showShellTabs(place: ShellPlace): boolean {
  return place !== "entry" && place !== "directions";
}

/**
 * Registered tab destinations once slices merge (do not import until on main):
 * - plan: PlanView
 * - readout: ReadoutView (may replace home after last conference day)
 */
