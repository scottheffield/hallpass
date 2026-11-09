import type { CheckInRequest, CheckInResponse, PlanResponse, ProfileResponse } from "../../shared/api";
import { EVENT_OFFSET } from "../../shared/event";
import type { CheckIn, IsoDateTime, MovedGoal, WorthIt } from "../../shared/types";
import { getAttendeeId } from "./attendee";

export const OFFLINE_CHECKIN_SAVED_COPY =
  "Saved on this device. We'll send it when you're online." as const;

const CACHE_PLAN_KEY = "hallpass.cache.plan";
const CACHE_PROFILE_KEY = "hallpass.cache.profile";
const CHECKIN_QUEUE_KEY = "hallpass.checkin.queue";

const WORTH_IT: readonly WorthIt[] = ["yes", "mixed", "no"];
const MOVED_GOAL: readonly MovedGoal[] = ["yes", "a_little", "no"];

export interface CachedEnvelope<T> {
  savedAt: IsoDateTime;
  body: T;
}

export interface QueuedCheckIn {
  /** `${attendee_id}:${session_id}` so retries overwrite instead of duplicating. */
  id: string;
  body: CheckInRequest;
  queuedAt: IsoDateTime;
}

type CheckInSender = (body: CheckInRequest) => Promise<void>;

let checkInSender: CheckInSender | null = null;
let syncStarted = false;

/** Shared browser online flag for the corner agent (Brief 21). */
export function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

export function conferenceIsoFromDate(date: Date): IsoDateTime {
  const offsetHours = 7;
  const wall = new Date(date.getTime() - offsetHours * 3_600_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${wall.getUTCFullYear()}-${pad(wall.getUTCMonth() + 1)}-${pad(wall.getUTCDate())}T${pad(wall.getUTCHours())}:${pad(wall.getUTCMinutes())}:${pad(wall.getUTCSeconds())}${EVENT_OFFSET}`;
}

export function checkInQueueId(sessionId: string, attendeeId = getAttendeeId()): string {
  return `${attendeeId}:${sessionId.trim()}`;
}

export function isCheckInRequest(body: unknown): body is CheckInRequest {
  if (!body || typeof body !== "object") return false;
  const candidate = body as CheckInRequest;
  if (typeof candidate.session_id !== "string" || !candidate.session_id.trim()) return false;
  if (candidate.session_id.length > 200) return false;
  if (!WORTH_IT.includes(candidate.worth_it)) return false;
  if (!MOVED_GOAL.includes(candidate.moved_goal)) return false;
  if (candidate.note !== undefined) {
    if (typeof candidate.note !== "string") return false;
    if (candidate.note.length > 280) return false;
  }
  return true;
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or quota.
  }
}

export function cachePlanResponse(body: PlanResponse, savedAt = conferenceIsoFromDate(new Date())): void {
  const envelope: CachedEnvelope<PlanResponse> = { savedAt, body };
  writeJson(CACHE_PLAN_KEY, envelope);
}

export function cacheProfileResponse(body: ProfileResponse, savedAt = conferenceIsoFromDate(new Date())): void {
  const envelope: CachedEnvelope<ProfileResponse> = { savedAt, body };
  writeJson(CACHE_PROFILE_KEY, envelope);
}

export function readCachedPlan(): CachedEnvelope<PlanResponse> | null {
  const envelope = readJson<CachedEnvelope<PlanResponse>>(CACHE_PLAN_KEY);
  if (!envelope?.savedAt || !envelope.body) return null;
  return envelope;
}

export function readCachedProfile(): CachedEnvelope<ProfileResponse> | null {
  const envelope = readJson<CachedEnvelope<ProfileResponse>>(CACHE_PROFILE_KEY);
  if (!envelope?.savedAt || !envelope.body) return null;
  return envelope;
}

export function newestCacheFreshness(): IsoDateTime | null {
  const plan = readCachedPlan()?.savedAt;
  const profile = readCachedProfile()?.savedAt;
  if (plan && profile) return plan > profile ? plan : profile;
  return plan ?? profile ?? null;
}

function readQueue(): QueuedCheckIn[] {
  const list = readJson<QueuedCheckIn[]>(CHECKIN_QUEUE_KEY);
  return Array.isArray(list) ? list : [];
}

function writeQueue(queue: QueuedCheckIn[]): void {
  writeJson(CHECKIN_QUEUE_KEY, queue);
}

/** Upserts by queue id so the same session check-in is not duplicated. */
export function upsertQueuedCheckIn(body: CheckInRequest, queuedAt = conferenceIsoFromDate(new Date())): QueuedCheckIn {
  const id = checkInQueueId(body.session_id);
  const entry: QueuedCheckIn = { id, body, queuedAt };
  const queue = readQueue().filter((item) => item.id !== id);
  queue.push(entry);
  queue.sort((a, b) => a.queuedAt.localeCompare(b.queuedAt));
  writeQueue(queue);
  notifyCheckInQueued();
  return entry;
}

export function listQueuedCheckIns(): QueuedCheckIn[] {
  return readQueue();
}

export function removeQueuedCheckIn(id: string): void {
  writeQueue(readQueue().filter((item) => item.id !== id));
}

export function offlineCheckInResponse(body: CheckInRequest, at = conferenceIsoFromDate(new Date())): CheckInResponse {
  const checkin: CheckIn = {
    attendee_id: getAttendeeId(),
    session_id: body.session_id.trim(),
    at,
    worth_it: body.worth_it,
    moved_goal: body.moved_goal,
  };
  if (body.note) checkin.note = body.note;
  return { checkin, proposal: null };
}

export function setCheckInSender(sender: CheckInSender): void {
  checkInSender = sender;
}

export function isNetworkFailure(err: unknown): boolean {
  return err instanceof TypeError;
}

export async function flushCheckInQueue(): Promise<number> {
  if (!checkInSender || !isOnline()) return 0;
  let sent = 0;
  for (const item of listQueuedCheckIns()) {
    try {
      await checkInSender(item.body);
      removeQueuedCheckIn(item.id);
      sent += 1;
    } catch {
      break;
    }
  }
  return sent;
}

function notifyCheckInQueued(): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent("hallpass-checkin-queued"));
  } catch {
    // Ignore when CustomEvent is unavailable.
  }
}

/** Register online flush and send any backlog after a reload. */
export function startOfflineSync(): void {
  if (typeof window === "undefined" || syncStarted) return;
  syncStarted = true;
  const run = () => {
    void flushCheckInQueue();
  };
  window.addEventListener("online", run);
  if (isOnline()) run();
}
