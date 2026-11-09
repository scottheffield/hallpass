// API contract. Shapes come from docs/BUILD-PLAN.md. Slices build against this file.
// Attendee text is always in a POST body. Every response is JSON except POST /api/agent (SSE).

import type {
  CaseForAttending,
  CheckIn,
  Energy,
  Insights,
  MovedGoal,
  Pacing,
  Plan,
  PlanChange,
  PlanProposal,
  Profile,
  Readout,
  WorthIt,
} from "./types";

export type { PlanChange, PlanProposal };

export interface IntakeAnswers {
  /** Opening question: "What would make this conference worth it?" */
  purpose: string;
  /** The attendee chose "I'm still figuring it out". */
  figuring_it_out?: boolean;
  /** Starter goals they tapped. Ids are not required; these are their words. */
  starter_goals?: string[];
  role?: string;
  problems?: string[];
  tools?: string[];
  people_to_see?: string[];
  expertise_to_see?: string[];
  topics?: string[];
  /** UI labels are relaxed / balanced / full. Values are the Pacing enum. */
  pacing?: Pacing;
  energy?: Energy;
  breaks?: string;
  access_needs?: string;
  /** Answer to a previous `clarify` question. Asked at most once. */
  clarify_answer?: string;
}

/** Profile before it is saved. The server adds `attendee_id` and `updated_at`. */
export type ProfileDraft = Omit<Profile, "attendee_id" | "updated_at">;

export interface AgentMessage {
  role: "user" | "assistant";
  content: string;
}

export const AGENT_LIMITS = { maxMessages: 10, maxChars: 1000 } as const;

/** Null when the list is within the agent limits. The string is safe to show; it never echoes content. */
export function agentRequestError(messages: unknown): string | null {
  if (!Array.isArray(messages)) return "Messages must be a list.";
  if (messages.length > AGENT_LIMITS.maxMessages) {
    return `Send at most ${AGENT_LIMITS.maxMessages} messages.`;
  }
  for (const message of messages) {
    if (!message || typeof message !== "object") return "Each message needs a role and content.";
    const candidate = message as AgentMessage;
    if (candidate.role !== "user" && candidate.role !== "assistant") {
      return "Message role must be user or assistant.";
    }
    if (typeof candidate.content !== "string") return "Message content must be text.";
    if (candidate.content.length > AGENT_LIMITS.maxChars) {
      return `Each message must be at most ${AGENT_LIMITS.maxChars} characters.`;
    }
  }
  return null;
}

export type PlanAction = "pin" | "drop" | "swap";

export function isPlanAction(value: unknown): value is PlanAction {
  return value === "pin" || value === "drop" || value === "swap";
}

export interface HealthResponse {
  ok: boolean;
  model: string;
  configured: { claude: boolean; elastic: boolean };
  /** Present on `GET /api/health?deep=1`. No model text. */
  claude?: "ok" | "error";
  /** Why the Claude check did not succeed. No secrets and no model text. */
  fallback?: string;
  /** Present on `GET /api/health?deep=1`. */
  elastic?: "ok" | "error";
  /** Why the Elastic check did not succeed. No secrets and no URLs. */
  elastic_fallback?: string;
}

export interface InterviewRequest {
  answers: IntakeAnswers;
}

export interface InterviewResponse {
  profile: ProfileDraft;
  /** One clarifying question. Absent when the answers are enough to plan. */
  clarify?: string;
  /** True when the draft was built without Claude (or Claude failed). Safe to show in UI. */
  basic?: boolean;
  stub?: boolean;
}

export interface ProfileSaveRequest {
  profile: ProfileDraft;
}

export interface ProfileResponse {
  profile: Profile | null;
  stub?: boolean;
}

export interface PlanDayRequest {
  /** Conference date, `YYYY-MM-DD`. */
  day: string;
}

export interface PlanResponse {
  plan: Plan | null;
  stub?: boolean;
}

export interface PlanEditRequest {
  day: string;
  session_id: string;
  action: PlanAction;
}

export interface PlanEditResponse {
  plan: Plan;
  changes: PlanChange[];
  stub?: boolean;
}

export interface CheckInRequest {
  session_id: string;
  worth_it: WorthIt;
  moved_goal: MovedGoal;
  note?: string;
  /** Original check-in time from an offline queue flush. Server accepts only when in the past. */
  at?: string;
}

export interface CheckInResponse {
  checkin: CheckIn;
  proposal: PlanProposal | null;
  stub?: boolean;
}

export interface ApplyProposalRequest {
  proposal_id: string;
  accept: boolean;
}

export interface CaseResponse {
  case: CaseForAttending;
  stub?: boolean;
}

export interface ReadoutResponse {
  readout: Readout;
  stub?: boolean;
}

export interface AgentRequest {
  messages: AgentMessage[];
}

export interface InsightsResponse extends Insights {
  stub?: boolean;
}

export interface DemoLoadResponse {
  profile: Profile;
  plan: Plan;
  stub?: boolean;
}
