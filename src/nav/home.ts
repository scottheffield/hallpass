import { EVENT_DAYS } from "../../shared/event";
import type { Profile } from "../../shared/types";
import type { AppTab } from "../ui/AppFrame";
import { conferenceDateKey } from "../screens/today/timeline";
import type { ShellPlace } from "./types";
import { tabToPlace } from "./types";

export function pickHomeTab(now: Date, profile: Profile | null): AppTab {
  if (!profile) return "today";
  const dayKey = conferenceDateKey(now);
  if ((EVENT_DAYS as readonly string[]).includes(dayKey)) return "today";
  const first = EVENT_DAYS[0];
  const last = EVENT_DAYS[EVENT_DAYS.length - 1];
  if (dayKey < first) return "plan";
  if (dayKey > last) return "today";
  return "today";
}

export function pickInitialPlace(profile: Profile | null): ShellPlace {
  return profile ? "today" : "entry";
}

/** Keeps the selected tab and rendered place in sync after boot or intake. */
export function pickHomeShell(
  now: Date,
  profile: Profile | null,
): { tab: AppTab; place: ShellPlace } {
  if (!profile) {
    return { tab: "today", place: "entry" };
  }
  const tab = pickHomeTab(now, profile);
  return { tab, place: tabToPlace(tab) };
}
