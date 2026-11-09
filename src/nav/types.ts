import type { AppTab } from "../ui/AppFrame";

/** Primary shell routes. Extend here as slices merge. */
export type ShellPlace = "entry" | "today" | "plan" | "goals" | "directions";

/** Focused overlays that keep the underlying tab place. */
export type ShellOverlay = "break" | null;

// Future places (not on main yet — wire in App when slices land):
// | "readout"
// | "intake" is represented as place === "entry" via IntakeFlow

export interface DirectionsTarget {
  sessionId: string;
  sessionTitle: string;
  sessionTime: string;
  roomName: string;
}

export interface CheckInTarget {
  sessionId: string;
  sessionTitle: string;
  sessionTime: string;
  sessionRoom: string;
}

export function tabToPlace(tab: AppTab): ShellPlace {
  if (tab === "today") return "today";
  if (tab === "plan") return "plan";
  return "goals";
}
