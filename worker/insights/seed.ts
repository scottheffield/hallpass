import type { MovedGoal, Pacing } from "../../shared/types";
import type { OrganizerRows } from "./rows";

/** Deterministic demo rows. Theme ids and session ids only — no attendee names or goal text. */
const THEMES = ["observability", "platform-engineering", "security", "delivery", "community"] as const;
const SESSIONS = ["1246200", "1246201", "1246202", "1246203", "1246204"] as const;
const MOVED: MovedGoal[] = ["yes", "a_little", "no"];
const PACINGS: Pacing[] = ["light", "balanced", "packed"];

function seededPick(seed: number, modulo: number): number {
  return ((seed * 1103515245 + 12345) >>> 0) % modulo;
}

/** Thirty fictional attendees with enough volume for small-bucket rules in local dev. */
export function seedOrganizerRows(): OrganizerRows {
  const profiles: OrganizerRows["profiles"] = [];
  const checkins: OrganizerRows["checkins"] = [];
  const readouts: OrganizerRows["readouts"] = [];

  for (let i = 0; i < 30; i += 1) {
    const themeA = THEMES[seededPick(i, THEMES.length)] ?? "observability";
    const themeB = THEMES[seededPick(i + 7, THEMES.length)] ?? "security";
    const pacing = PACINGS[seededPick(i + 3, PACINGS.length)] ?? "balanced";
    profiles.push({
      goal_themes: i % 5 === 0 ? [themeA] : [themeA, themeB],
      pacing,
      wants_break: pacing === "light" || i % 4 === 0,
    });

    const checkinCount = 2 + (i % 5);
    for (let j = 0; j < checkinCount; j += 1) {
      const session = SESSIONS[seededPick(i * 3 + j, SESSIONS.length)] ?? SESSIONS[0];
      checkins.push({
        session_id: session,
        moved_goal: MOVED[seededPick(i + j, MOVED.length)] ?? "no",
      });
    }

    if (i % 2 === 0) {
      const gap = THEMES[seededPick(i + 11, THEMES.length)] ?? "community";
      readouts.push({ gap_themes: [gap] });
    }
  }

  return { profiles, plans: 30, checkins, readouts };
}
