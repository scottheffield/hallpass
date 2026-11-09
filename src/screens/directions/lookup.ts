import type { Room } from "../../../shared/types";

const NO_WALKING_HINT =
  "No written walking directions for this room yet. Use the level and landmark above, ask at an Info Desk, or open the supplementary floor plan below.";

const UNKNOWN_ROOM =
  "This room is not in the venue list yet. Ask at an Info Desk, or open the supplementary floor plan below.";

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

export function accessNeedsMentionStepFree(accessNeeds?: string): boolean {
  if (!accessNeeds?.trim()) return false;
  return STEP_FREE_PATTERN.test(accessNeeds);
}

export function shouldShowStepFreeHint(room: Room | undefined, accessNeeds?: string): boolean {
  const hint = room?.step_free_hint?.trim();
  if (!hint) return false;
  if (accessNeeds === undefined) return true;
  return accessNeedsMentionStepFree(accessNeeds);
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
      knownRoom: false,
      hasWalkingHint: false,
    };
  }

  const walking = room.walking_hint.trim();
  const stepFree =
    shouldShowStepFreeHint(room, accessNeeds) && room.step_free_hint?.trim()
      ? room.step_free_hint.trim()
      : undefined;

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
