import type { MovedGoal, Pacing } from "../../shared/types";

/** Rows used for aggregation. No attendee ids, notes, or free-text goals. */
export interface ProfileRow {
  goal_themes: string[];
  pacing: Pacing;
  wants_break: boolean;
}

export interface CheckInRow {
  session_id: string;
  moved_goal: MovedGoal;
}

export interface ReadoutRow {
  gap_themes: string[];
}

export interface OrganizerRows {
  profiles: ProfileRow[];
  plans: number;
  checkins: CheckInRow[];
  readouts: ReadoutRow[];
}

export const EMPTY_ROWS: OrganizerRows = {
  profiles: [],
  plans: 0,
  checkins: [],
  readouts: [],
};
