import type { CheckInRequest } from "../../../shared/api";
import type { MovedGoal, PlanChange, WorthIt } from "../../../shared/types";

export const NOTE_MAX = 280;

export const WORTH_IT_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "mixed", label: "Mixed" },
  { value: "no", label: "No" },
] as const satisfies readonly { value: WorthIt; label: string }[];

export const MOVED_GOAL_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "a_little", label: "A little" },
  { value: "no", label: "No" },
] as const satisfies readonly { value: MovedGoal; label: string }[];

export function trimNote(note: string): string {
  return note.trim();
}

export function noteExceedsLimit(note: string): boolean {
  return trimNote(note).length > NOTE_MAX;
}

/** Returns null when ratings are incomplete or the note is over the limit. Notes stay in the POST body, never the URL. */
export function buildCheckInRequest(
  sessionId: string,
  worthIt: WorthIt | "",
  movedGoal: MovedGoal | "",
  note: string,
): CheckInRequest | null {
  if (!sessionId.trim() || !worthIt || !movedGoal) return null;
  if (noteExceedsLimit(note)) return null;
  const body: CheckInRequest = {
    session_id: sessionId.trim(),
    worth_it: worthIt,
    moved_goal: movedGoal,
  };
  const trimmed = trimNote(note);
  if (trimmed) body.note = trimmed;
  return body;
}

export function proposalChangeTexts(changes: readonly PlanChange[]): string[] {
  return changes.map((change) => change.text).filter((text) => text.trim().length > 0);
}
