import type { AppTab } from "../ui/AppFrame";

/** Primary shell routes and focused auxiliary screens. */
export type ShellPlace =
  | "entry"
  | "today"
  | "plan"
  | "goals"
  | "directions"
  | "case"
  | "readout"
  | "insights";

/** Focused overlays that keep the underlying tab place. */
export type ShellOverlay = "break" | null;

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
  /** Feedback after leaving the session before it ended. */
  leftEarly?: boolean;
}

export function tabToPlace(tab: AppTab): ShellPlace {
  if (tab === "today") return "today";
  if (tab === "plan") return "plan";
  return "goals";
}

/** Tab destinations that use the bottom tab bar. */
export function isTabPlace(place: ShellPlace): boolean {
  return place === "today" || place === "plan" || place === "goals";
}
