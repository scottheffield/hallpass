import type { Room } from "../../../shared/types";

const NO_WALKING_HINT =
  "No written walking directions for this room yet. Use the level and landmark above, ask at an Info Desk, or open the supplementary floor plan below.";

const UNKNOWN_ROOM =
  "This room is not in the venue list yet. Ask at an Info Desk, or open the supplementary floor plan below.";

const NO_STEP_FREE_VERIFIED =
  "No verified step-free route is listed for this room. Ask at an Info Desk for an accessible path.";

export interface DirectionsContent {
  roomName: string;
  level: string;
  landmark: string;
  walkingText: string;
  stepFreeText?: string;
  knownRoom: boolean;
  hasWalkingHint: boolean;
}

/** Match profile copy from brief 21: show step-free only when access needs mention it. */
const STEP_FREE_PATTERN = /\bstep[- ]?free\b|\bwheelchair\b|\bno stairs\b|\belevator\b/i;

export function findRoomByName(rooms: Room[], roomName: string): Room | undefined {
  const target = roomName.trim();
  if (!target) return undefined;
  return rooms.find((room) => room.name === target);
}

/** Blank or whitespace-only access needs behave like omitted. */
export function effectiveAccessNeeds(accessNeeds?: string): string | undefined {
  const trimmed = accessNeeds?.trim();
  return trimmed ? trimmed : undefined;
}

export function accessNeedsMentionStepFree(accessNeeds?: string): boolean {
  const needs = effectiveAccessNeeds(accessNeeds);
  if (!needs) return false;
  return STEP_FREE_PATTERN.test(needs);
}

export function shouldShowStepFreeHint(room: Room | undefined, accessNeeds?: string): boolean {
  const hint = room?.step_free_hint?.trim();
  if (!hint) return false;
  if (effectiveAccessNeeds(accessNeeds) === undefined) return true;
  return accessNeedsMentionStepFree(accessNeeds);
}

function resolveStepFreeText(
  room: Room | undefined,
  accessNeeds?: string,
): string | undefined {
  const needs = effectiveAccessNeeds(accessNeeds);
  const hint = room?.step_free_hint?.trim();

  if (needs && accessNeedsMentionStepFree(needs)) {
    return hint || NO_STEP_FREE_VERIFIED;
  }
  if (!needs && hint) {
    return hint;
  }
  return undefined;
}

export function buildDirectionsContent(
  rooms: Room[],
  roomName: string,
  accessNeeds?: string,
): DirectionsContent {
  const room = findRoomByName(rooms, roomName);
  const trimmedName = roomName.trim() || "Unknown room";

  if (!room) {
    return {
      roomName: trimmedName,
      level: "",
      landmark: "",
      walkingText: UNKNOWN_ROOM,
      stepFreeText: resolveStepFreeText(undefined, accessNeeds),
      knownRoom: false,
      hasWalkingHint: false,
    };
  }

  const walking = room.walking_hint.trim();
  const stepFree = resolveStepFreeText(room, accessNeeds);

  return {
    roomName: room.name,
    level: room.level,
    landmark: room.landmark,
    walkingText: walking || NO_WALKING_HINT,
    stepFreeText: stepFree,
    knownRoom: true,
    hasWalkingHint: walking.length > 0,
  };
}

export const FLOOR_PLAN_PATH = "/floor/salt-palace-flat-map.pdf";

export const FLOOR_PLAN_LINK_LABEL =
  "Open the Salt Palace flat floor plan (PDF, supplementary). Text directions above are the primary route.";
