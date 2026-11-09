import { GOAL_THEMES } from "../../../shared/event";

/** Human-readable theme label from the closed list; unknown ids stay as-is. */
export function goalThemeLabel(themeId: string): string {
  const match = GOAL_THEMES.find((theme) => theme.id === themeId);
  return match?.label ?? themeId.replaceAll("-", " ");
}

/** Whole-number percent for moved-goal rate (0–1 input). */
export function formatMovedGoalPercent(rate: number): string {
  if (!Number.isFinite(rate)) return "—";
  const clamped = Math.min(1, Math.max(0, rate));
  return `${Math.round(clamped * 100)}%`;
}

/** Bar width as a percentage of the section maximum (at least 1 to avoid divide-by-zero). */
export function barWidthPercent(value: number, max: number): number {
  const safeMax = Math.max(1, max);
  const safeValue = Math.max(0, value);
  return Math.min(100, Math.round((safeValue / safeMax) * 100));
}

export function formatAttendeeSample(n: number): string {
  if (n === 0) return "No attendee profiles yet.";
  if (n === 1) return "Based on 1 attendee profile.";
  return `Based on ${n} attendee profiles.`;
}

export function formatBreakDemand(count: number, nAttendees: number): string {
  if (nAttendees === 0) return "No pacing data yet.";
  if (count === 0) return "No profiles asked for lighter pacing or breaks.";
  if (count === 1) return "1 profile asked for lighter pacing or breaks.";
  return `${count} profiles asked for lighter pacing or breaks.`;
}

/** Session row label: agenda title when known, otherwise a neutral id label. */
export function sessionRowLabel(sessionId: string, title?: string): string {
  const trimmed = title?.trim();
  if (trimmed) return trimmed;
  return `Session ${sessionId}`;
}

export function formatCheckInSample(n: number): string {
  if (n === 0) return "";
  if (n === 1) return "1 check-in";
  return `${n} check-ins`;
}
