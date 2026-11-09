import { LEVEL_UNKNOWN, parseRoom } from "../../shared/venue";

const DISPLAY_SEP = " · ";

/** Human-readable room label from a session.room or rooms.json name. */
export function formatRoomDisplay(roomName: string): string {
  const trimmed = roomName.trim();
  if (!trimmed) return trimmed;

  const parsed = parseRoom(trimmed);
  if (parsed.kind === "unknown" && !trimmed.includes("|")) {
    return trimmed;
  }
  if (parsed.kind === "off-site") {
    return trimmed;
  }

  const parts: string[] = [];
  if (parsed.room) parts.push(parsed.room);
  if (parsed.level !== LEVEL_UNKNOWN) parts.push(parsed.level);
  if (parsed.building) parts.push(parsed.building);

  if (parts.length === 0) return trimmed;
  return parts.join(DISPLAY_SEP);
}
