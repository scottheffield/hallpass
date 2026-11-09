import type { Room } from "../../shared/types";
import { LEVEL_UNKNOWN, parseRoom } from "../../shared/venue";
import type { Env } from "../env";

let cached: Room[] | null = null;

function parseRooms(value: unknown): Room[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const rooms: Room[] = [];
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const candidate = row as Room;
    if (typeof candidate.name !== "string" || typeof candidate.level !== "string") continue;
    if (typeof candidate.landmark !== "string" || typeof candidate.walking_hint !== "string") continue;
    rooms.push(candidate);
  }
  return rooms.length > 0 ? rooms : null;
}

/** Clears the isolate cache so loadRooms can retry after a failed fetch (tests). */
export function resetRoomsCacheForTests(): void {
  cached = null;
}

/** Loads public/rooms.json through the asset binding. Cached only after a successful parse. */
export async function loadRooms(env: Env): Promise<Room[]> {
  if (cached) return cached;
  try {
    const response = await env.ASSETS.fetch(new Request("https://hallpass.local/rooms.json"));
    if (response.ok) {
      const body: unknown = await response.json().catch(() => null);
      const parsed = parseRooms(body);
      if (parsed) {
        cached = parsed;
        return parsed;
      }
    } else {
      await response.body?.cancel();
    }
  } catch (err) {
    console.error("rooms_load", { name: err instanceof Error ? err.name : "unknown" });
  }
  return [];
}

function sameParsedVenueRoom(
  a: ReturnType<typeof parseRoom>,
  b: ReturnType<typeof parseRoom>,
  from: string,
  to: string,
): boolean {
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

/** Agent-local compare: full venue paths, trim, and short room labels via parseRoom().room. */
function roomNamesMatch(from: string, to: string): boolean {
  const fromTrim = from.trim();
  const toTrim = to.trim();
  if (!fromTrim || !toTrim) return false;
  if (fromTrim === toTrim) return true;

  const a = parseRoom(fromTrim);
  const b = parseRoom(toTrim);

  if (sameParsedVenueRoom(a, b, fromTrim, toTrim)) return true;

  if (a.room !== "" && a.room === b.room) {
    const aShort = !fromTrim.includes("|");
    const bShort = !toTrim.includes("|");
    if (aShort || bShort) return true;
  }

  return false;
}

export function roomForName(rooms: Room[], roomName: string): Room | null {
  const target = roomName.trim();
  if (!target) return null;
  return rooms.find((room) => roomNamesMatch(room.name, target)) ?? null;
}
