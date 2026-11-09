import { formatHeaderDate } from "../today/timeline";
import { dayTabLabel } from "./days";

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

export interface PlanDayReadyCopy {
  title: string;
  /** What the attendee can do on this screen while reviewing. */
  reviewLines: readonly string[];
  /** Shown when the selected day is not the conference today. */
  futureTodayLine: string | null;
  /** True when the selected day matches the conference calendar date. */
  offerOpenToday: boolean;
}

export function planDayReadyCopy(
  selectedDayKey: string,
  conferenceDayKey: string,
): PlanDayReadyCopy {
  const longDay = formatHeaderDate(selectedDayKey);
  const offerOpenToday = selectedDayKey === conferenceDayKey;
  return {
    title: selectedDayPlanReadyTitle(selectedDayKey),
    reviewLines: [
      "Planning for this day is complete. Review the sessions below before the day starts.",
      "Open Details and alternatives on a session to see why it is here, keep it, find another, or remove it.",
    ],
    futureTodayLine: offerOpenToday
      ? null
      : `When ${longDay} starts, open Today in the tab bar for your next session and directions.`,
    offerOpenToday,
  };
}
