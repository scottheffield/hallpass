import type { Readout } from "../../../shared/types";

export const READOUT_FALLBACK_GAP = "Summary built from your check-ins (AI unavailable).";
export const NOT_ENOUGH_PREFIX = "Not enough feedback to tell";

export function readoutHeading(final: boolean): string {
  return final ? "Your conference" : "Your conference, so far";
}

export function isSystemGap(line: string): boolean {
  const trimmed = line.trim();
  return trimmed === READOUT_FALLBACK_GAP || trimmed.startsWith("Draft built from your profile");
}

export function parseNotEnoughGoal(gap: string): string | null {
  if (!gap.startsWith(NOT_ENOUGH_PREFIX)) return null;
  const rest = gap.slice(NOT_ENOUGH_PREFIX.length).replace(/^:\s*/, "").trim();
  return rest || null;
}

export function hasCheckInEvidence(readout: Readout): boolean {
  if (readout.goals_hit.length > 0 || readout.goals_missed.length > 0 || readout.helped_sessions.length > 0) {
    return true;
  }
  return readout.gaps.some((gap) => !isSystemGap(gap) && !parseNotEnoughGoal(gap));
}

export function readoutEvidenceLine(readout: Readout): string {
  return hasCheckInEvidence(readout) ? "Based on your check-ins" : "No check-ins yet";
}

export function unclearGoals(readout: Readout): string[] {
  return readout.gaps.flatMap((gap) => {
    const goal = parseNotEnoughGoal(gap);
    return goal ? [goal] : [];
  });
}

export function contentGaps(readout: Readout): string[] {
  return readout.gaps.filter((gap) => !isSystemGap(gap) && !parseNotEnoughGoal(gap));
}

/** Manager recap is the first follow-up when the API built one. */
export function teamRecapDraft(followups: readonly string[]): string {
  return followups[0]?.trim() ?? "";
}

export function suggestionFollowups(followups: readonly string[]): string[] {
  if (followups.length <= 1) return [];
  return followups.slice(1).map((line) => line.trim()).filter(Boolean);
}

export function goalStatusLabel(kind: "hit" | "missed" | "unclear"): string {
  if (kind === "hit") return "Some progress";
  if (kind === "missed") return "Still open";
  return "Not enough feedback";
}
