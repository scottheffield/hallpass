import { formatHeaderDate } from "../today/timeline";
import { dayTabLabel } from "./days";

export type PlanDayRelation = "past" | "today" | "future";

export interface PlanDayReadyInput {
  generating: boolean;
  genError: string | null;
  timelineLength: number;
}

/** Selected day has a finished schedule worth reviewing. */
export function isSelectedDayPlanReady(input: PlanDayReadyInput): boolean {
  if (input.generating || input.genError) return false;
  return input.timelineLength > 0;
}

export function selectedDayPlanReadyTitle(selectedDayKey: string): string {
  const label = dayTabLabel(selectedDayKey);
  return `${label}'s plan is ready`;
}

/** YYYY-MM-DD keys compare correctly as strings. */
export function planDayRelation(
  selectedDayKey: string,
  conferenceDayKey: string,
): PlanDayRelation {
  if (selectedDayKey < conferenceDayKey) return "past";
  if (selectedDayKey === conferenceDayKey) return "today";
  return "future";
}

const SESSION_REVIEW_LINE =
  "Open a session to see why it is here, keep it, find another, or remove it.";

export interface PlanDayReadyCopy {
  title: string;
  /** What the attendee can do on this screen while reviewing. */
  reviewLines: readonly string[];
  /** Shown when the selected day is still ahead on the calendar. */
  futureTodayLine: string | null;
  /** True when the selected day matches the conference calendar date. */
  offerOpenToday: boolean;
}

export function planDayReadyCopy(
  selectedDayKey: string,
  conferenceDayKey: string,
): PlanDayReadyCopy {
  const longDay = formatHeaderDate(selectedDayKey);
  const relation = planDayRelation(selectedDayKey, conferenceDayKey);
  const offerOpenToday = relation === "today";
  const completionLine =
    relation === "future"
      ? "Planning for this day is complete. Review the sessions below before the day starts."
      : "Planning for this day is complete.";
  return {
    title: selectedDayPlanReadyTitle(selectedDayKey),
    reviewLines: [completionLine, SESSION_REVIEW_LINE],
    futureTodayLine:
      relation === "future"
        ? `When ${longDay} starts, open Today in the tab bar for your next session and directions.`
        : null,
    offerOpenToday,
  };
}
