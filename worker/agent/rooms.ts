import type { Room } from "../../shared/types";
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

/** Loads public/rooms.json through the asset binding. Cached per isolate after a successful load. */
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

/** Exact match on Session.room / Room.name. */
export function roomForName(rooms: Room[], roomName: string): Room | null {
  return rooms.find((room) => room.name === roomName) ?? null;
}
