import type { Room } from "../../shared/types";

let cached: Room[] | null = null;

function parseRooms(value: unknown): Room[] | null {
  if (!Array.isArray(value)) return null;
  const rooms: Room[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const room = item as Room;
    if (typeof room.name !== "string") return null;
    rooms.push(room);
  }
  return rooms;
}

/** Loads public/rooms.json once per page load. */
export async function loadRooms(): Promise<Room[]> {
  if (cached) return cached;
  try {
    const response = await fetch("/rooms.json", { cache: "no-store" });
    if (response.ok) {
      const body: unknown = await response.json();
      const rooms = parseRooms(body);
      if (rooms) {
        cached = rooms;
        return rooms;
      }
    } else {
      await response.body?.cancel();
    }
  } catch {
    // Offline or missing file.
  }
  cached = [];
  return cached;
}
