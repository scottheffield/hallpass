import { EVENT_DAYS } from "../../../shared/event";

/** Stable id for a day tab control. */
export function planDayTabId(dayKey: string): string {
  return `plan-day-tab-${dayKey}`;
}

/** Stable id for a day's schedule panel. */
export function planDayPanelId(dayKey: string): string {
  return `plan-day-panel-${dayKey}`;
}

/** Tab label for assistive tech when selection is not conveyed by color alone. */
export function planDayTabAccessibleName(shortLabel: string, selected: boolean): string {
  return selected ? `${shortLabel}, selected` : shortLabel;
}

export type DayTabArrowKey = "ArrowLeft" | "ArrowRight" | "Home" | "End";

/** Next tab index for roving keyboard navigation, or null when the key is not handled. */
export function dayTabFocusIndex(
  currentIndex: number,
  key: DayTabArrowKey,
  dayCount: number = EVENT_DAYS.length,
): number | null {
  if (dayCount <= 0) return null;
  const last = dayCount - 1;
  switch (key) {
    case "Home":
      return 0;
    case "End":
      return last;
    case "ArrowLeft":
      return currentIndex <= 0 ? last : currentIndex - 1;
    case "ArrowRight":
      return currentIndex >= last ? 0 : currentIndex + 1;
    default:
      return null;
  }
}
