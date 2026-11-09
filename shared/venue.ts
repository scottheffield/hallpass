export type VenueKind = "salt-palace" | "hyatt" | "off-site" | "unknown";

export const LEVEL_UNKNOWN = "unknown";

const DISPLAY_SEP = " · ";

export interface ParsedRoom {
  building: string;
  level: string;
  room: string;
  kind: VenueKind;
}

const HYATT_LOBBY = "Hyatt Regency Lobby";
const OFF_SITE = "Off-Site Location";

function kindForBuilding(building: string): VenueKind {
  if (building === "Salt Palace") return "salt-palace";
  if (building === "Hyatt Regency") return "hyatt";
  return "unknown";
}

/** Split a session or room name into building, level, room, and venue kind. */
export function parseRoom(name: string): ParsedRoom {
  const trimmed = name.trim();
  if (!trimmed) {
    return { building: "", level: LEVEL_UNKNOWN, room: "", kind: "unknown" };
  }

  if (trimmed === OFF_SITE) {
    return {
      building: "",
      level: LEVEL_UNKNOWN,
      room: trimmed,
      kind: "off-site",
    };
  }

  if (trimmed === HYATT_LOBBY) {
    return {
      building: "Hyatt Regency",
      level: LEVEL_UNKNOWN,
      room: "Lobby",
      kind: "hyatt",
    };
  }

  if (!trimmed.includes("|")) {
    return {
      building: "",
      level: LEVEL_UNKNOWN,
      room: trimmed,
      kind: "unknown",
    };
  }

  const parts = trimmed.split("|").map((part) => part.trim());
  const building = parts[0] ?? "";
  const level = parts[1] ?? LEVEL_UNKNOWN;
  const room = parts.slice(2).join(" › ");

  return {
    building,
    level: level || LEVEL_UNKNOWN,
    room,
    kind: kindForBuilding(building),
  };
}

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

function isSameRoom(a: ParsedRoom, b: ParsedRoom, from: string, to: string): boolean {
  if (from.trim() === to.trim()) return true;
  return (
    a.building !== "" &&
    a.building === b.building &&
    a.level !== LEVEL_UNKNOWN &&
    b.level !== LEVEL_UNKNOWN &&
    a.level === b.level &&
    a.room !== "" &&
    a.room === b.room
  );
}

/** Walking-time estimates shared by Directions, plan, and the corner agent. */
export function transferMinutes(from: string, to: string): number {
  const fromTrim = from.trim();
  const toTrim = to.trim();
  const fromParsed = parseRoom(from);
  const toParsed = parseRoom(to);

  if (fromParsed.kind === "off-site" || toParsed.kind === "off-site") {
    return 30;
  }

  const eitherEmpty = !fromTrim || !toTrim;
  if (!eitherEmpty && isSameRoom(fromParsed, toParsed, from, to)) {
    return 0;
  }

  if (eitherEmpty) {
    return 12;
  }

  if (fromParsed.kind === "unknown" || toParsed.kind === "unknown") {
    return 12;
  }

  if (fromParsed.building !== toParsed.building) {
    return 12;
  }

  const sameLevel =
    fromParsed.level !== LEVEL_UNKNOWN &&
    toParsed.level !== LEVEL_UNKNOWN &&
    fromParsed.level === toParsed.level;

  if (sameLevel) {
    return 5;
  }

  return 8;
}
