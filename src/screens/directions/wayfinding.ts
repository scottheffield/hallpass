import { LEVEL_UNKNOWN, parseRoom, transferMinutes } from "../../../shared/venue";
import type { IsoDateTime, PlanItem, PlanItemStatus, Session } from "../../../shared/types";
import { parseInstant } from "../today/timeline";

export const NOT_ON_SALT_PALACE_PLAN =
  "This room isn't on the Salt Palace floor plan";

const AWAY_FROM_VENUE =
  "This room is away from the main venue. Check the session listing and allow extra time.";

/** One heading line from parseRoom, or the raw name when it does not parse. */
export function formatRoomHeading(roomName: string): string {
  const trimmed = roomName.trim();
  if (!trimmed) return trimmed;

  const parsed = parseRoom(trimmed);
  if (parsed.kind === "unknown" && !trimmed.includes("|")) {
    return trimmed;
  }
  if (parsed.kind === "off-site") {
    return trimmed;
  }

  if (parsed.building && parsed.level !== LEVEL_UNKNOWN) {
    return `${parsed.building} › ${parsed.level} › ${parsed.room}`;
  }
  if (parsed.building) {
    return `${parsed.building} › ${parsed.room}`;
  }
  return trimmed;
}

function eitherAwayFromMainVenue(fromName: string, toName: string): boolean {
  const from = parseRoom(fromName);
  const to = parseRoom(toName);
  return (
    from.kind === "off-site" ||
    from.kind === "unknown" ||
    to.kind === "off-site" ||
    to.kind === "unknown"
  );
}

/** Line above the walking hint describing the move from the previous session room. */
export function buildFromPreviousLine(
  previousRoomName: string | undefined,
  targetRoomName: string,
): string | undefined {
  const previous = previousRoomName?.trim();
  if (!previous) return undefined;

  const target = targetRoomName.trim() || targetRoomName;
  if (eitherAwayFromMainVenue(previous, target)) {
    return AWAY_FROM_VENUE;
  }

  const minutes = transferMinutes(previous, target);
  if (minutes === 0) {
    return "Same room. Stay put.";
  }

  const fromParsed = parseRoom(previous);
  const toParsed = parseRoom(target);

  if (fromParsed.building !== toParsed.building) {
    return `Next door in the ${toParsed.building}, through the indoor connection. Allow about ${minutes} minutes.`;
  }

  const sameLevel =
    fromParsed.level !== LEVEL_UNKNOWN &&
    toParsed.level !== LEVEL_UNKNOWN &&
    fromParsed.level === toParsed.level;

  if (sameLevel) {
    return `Same floor. Follow signs to ${toParsed.room}.`;
  }

  if (toParsed.level === LEVEL_UNKNOWN) {
    return `Follow signs to ${toParsed.room}.`;
  }

  return `Go to ${toParsed.level} by the escalators or a marked elevator, then follow signs to ${toParsed.room}.`;
}

export interface FloorLevelEntry {
  building: string;
  level: string;
  image: string;
  alt: string;
}

export function pickFloorLevel(
  roomName: string,
  levels: FloorLevelEntry[],
): FloorLevelEntry | undefined {
  const parsed = parseRoom(roomName);
  if (parsed.kind !== "salt-palace") return undefined;
  if (parsed.level === LEVEL_UNKNOWN) return undefined;
  return levels.find(
    (entry) => entry.building === parsed.building && entry.level === parsed.level,
  );
}

/** Alt text names the level and the room landmark from rooms.json. */
export function floorImageAlt(levelAlt: string, landmark: string): string {
  const landmarkText = landmark.trim();
  if (!landmarkText) return levelAlt;
  return `${levelAlt} Landmark: ${landmarkText}.`;
}

export function shouldShowSaltPalacePlan(roomName: string): boolean {
  return parseRoom(roomName).kind === "salt-palace";
}

function itemCountsAsPrevious(
  status: PlanItemStatus,
  sessionEndMs: number,
  nowMs: number,
): boolean {
  if (status === "done") return true;
  if (status === "skipped") return false;
  return Number.isFinite(sessionEndMs) && sessionEndMs <= nowMs;
}

/**
 * Previous room on today's plan: last done or past-by-clock session before the target.
 * Returns undefined for the first session of the day.
 */
export function previousRoomForDirections(
  sessions: Session[],
  items: PlanItem[],
  targetSessionId: string,
  nowIso: IsoDateTime,
): string | undefined {
  const target = sessions.find((s) => s.id === targetSessionId);
  if (!target) return undefined;

  const targetStartMs = parseInstant(target.start);
  if (!Number.isFinite(targetStartMs)) return undefined;

  const nowMs = parseInstant(nowIso);
  const nowForPast = Number.isFinite(nowMs) ? nowMs : Number.NaN;

  const sessionById = new Map(sessions.map((s) => [s.id, s]));

  let bestRoom: string | undefined;
  let bestEndMs = Number.NEGATIVE_INFINITY;

  for (const item of items) {
    if (item.session_id === targetSessionId) continue;
    const session = sessionById.get(item.session_id);
    if (!session) continue;

    const startMs = parseInstant(session.start);
    const endMs = parseInstant(session.end);
    if (!Number.isFinite(startMs) || startMs >= targetStartMs) continue;

    if (!itemCountsAsPrevious(item.status, endMs, nowForPast)) continue;
    if (!Number.isFinite(endMs) || endMs <= bestEndMs) continue;

    bestEndMs = endMs;
    bestRoom = session.room;
  }

  return bestRoom;
}
