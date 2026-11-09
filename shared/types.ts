// Shared data shapes for the browser and the Worker.
// Source: product spec, section 7. Change these in a small, separate PR.

/** ISO 8601 with offset, e.g. "2026-11-10T14:15:00-07:00". Never store times without an offset. */
export type IsoDateTime = string;

export type AttendeeId = string;

export interface Session {
  id: string;
  title: string;
  start: IsoDateTime;
  end: IsoDateTime;
  room: string;
  track: string;
  speakers: string[];
  abstract: string;
  /** Semantic field about the talk: title, description, track, subtopic, CNCF project. */
  search_text: string;
  /** Semantic field about the people: name, company, tagline, bio. */
  speaker_text: string;
  url?: string;
  tags?: string[];
  community?: string;
  /** Full-day entries that would otherwise clash with everything. */
  all_access?: boolean;
  access?: {
    captioned?: boolean;
    recorded?: boolean;
    quiet_room_adjacent?: boolean;
  };
}

export type Energy = "low" | "medium" | "high";
export type Pacing = "packed" | "balanced" | "light";

export interface Profile {
  attendee_id: AttendeeId;
  why_summary: string;
  /** 1 to 3 goals for the whole conference. */
  goals: string[];
  role: string;
  problems: string[];
  topics: string[];
  tools: string[];
  people_to_see: string[];
  expertise_to_see: string[];
  energy: Energy;
  pacing: Pacing;
  breaks: string;
  access_needs?: string;
  updated_at: IsoDateTime;
}

export type PlanItemStatus = "planned" | "done" | "skipped";

export interface PlanItem {
  session_id: string;
  status: PlanItemStatus;
  reason: string;
  beat_alternative?: { session_id: string; why: string };
  clash_note?: string;
  pinned?: boolean;
}

export interface PlanBreak {
  start: IsoDateTime;
  end: IsoDateTime;
  note: string;
}

export interface Plan {
  attendee_id: AttendeeId;
  /** Conference plan, scheduled by day. Keys are dates, e.g. "2026-11-10". */
  days: Record<string, { items: PlanItem[]; breaks: PlanBreak[] }>;
  /** "ai" or the labeled fallback "basic plan (AI unavailable)". */
  source: "ai" | "basic";
  updated_at: IsoDateTime;
}

export type WorthIt = "yes" | "mixed" | "no";
export type MovedGoal = "yes" | "a_little" | "no";

export interface CheckIn {
  attendee_id: AttendeeId;
  session_id: string;
  at: IsoDateTime;
  worth_it: WorthIt;
  moved_goal: MovedGoal;
  note?: string;
}

export interface CaseForAttending {
  attendee_id: AttendeeId;
  problems: string[];
  /** Session IDs from the plan. Build lists from retrieved data, never by parsing model text. */
  sessions: string[];
  bring_back: string[];
  text: string;
}

export interface Readout {
  attendee_id: AttendeeId;
  as_of: IsoDateTime;
  /** True after the last planned block of the conference. Otherwise shown as "so far". */
  final: boolean;
  goals_hit: string[];
  goals_missed: string[];
  helped_sessions: string[];
  gaps: string[];
  followups: string[];
}

/** Organizer view. Aggregates only, never individual rows, notes or access needs. */
export interface Insights {
  n_attendees: number;
  top_goals: { goal_theme: string; count: number }[];
  sessions_moving_goals: { session_id: string; moved_goal_rate: number; n: number }[];
  gaps: { gap_theme: string; count: number }[];
  break_demand: number;
}

/** Static with the app. */
export interface Room {
  /** Matches Session.room. */
  name: string;
  level: string;
  landmark: string;
  /** 1 to 2 sentences, screen-reader friendly. */
  walking_hint: string;
  step_free_hint?: string;
}

/** Every API error has this shape. Never return "no results" for a failure. */
export interface ApiError {
  error: string;
  code: "bad_request" | "too_large" | "rate_limited" | "not_implemented" | "upstream" | "internal";
}

export const ATTENDEE_HEADER = "X-Hallpass-Attendee";
