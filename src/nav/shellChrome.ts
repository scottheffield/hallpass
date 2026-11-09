import type { ShellPlace } from "./types";
import { showShellTabs } from "./tabs";

/** Tab bar hides while a sheet is open; Ask stays mounted on shell places. */
export function shellChromeForPlace(
  place: ShellPlace,
  sheetOpen: boolean,
): { showTabs: boolean; showAsk: boolean } {
  const placeHasShell = showShellTabs(place);
  return {
    showTabs: placeHasShell && !sheetOpen,
    showAsk: placeHasShell,
  };
}
