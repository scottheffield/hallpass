/** Session title in the sheet sits under the dialog h2; use h3 on the card. */
export const CHECKIN_SESSION_HEADING_LEVEL = 3 as const;

/** Visible label for the saved step; accompanies the icon, not color alone. */
export const CHECKIN_SAVED_LABEL = "Check-in saved";

/** Id prefix for the proposal rationale heading (h3 under the dialog title). */
export function checkInProposalHeadingId(suffix: string): string {
  return `checkin-proposal-why-${suffix}`;
}

/**
 * Picks where keyboard focus should land after the sheet closes.
 * Prefers the opener when it is still in the document; otherwise the main landmark.
 */
export function resolveSheetReturnFocus(
  opener: { isConnected?: boolean } | null | undefined,
  contentRoot: { focus?: () => void } | null | undefined,
): "opener" | "content" | "none" {
  if (opener?.isConnected) return "opener";
  if (contentRoot && typeof contentRoot.focus === "function") return "content";
  return "none";
}

/** Focus override runs only after close when the shell passes an opener ref (not on open). */
export function shouldOverrideSheetReturnFocus(open: boolean, returnFocusRefProvided: boolean): boolean {
  return !open && returnFocusRefProvided;
}
