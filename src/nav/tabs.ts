import type { ShellPlace } from "./types";
import { isTabPlace } from "./types";

/** Bottom tab bar visibility. Hide on intake and focused auxiliary screens. */
export function showShellTabs(place: ShellPlace): boolean {
  return isTabPlace(place);
}
