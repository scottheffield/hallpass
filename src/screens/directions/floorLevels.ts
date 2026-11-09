import type { FloorLevelEntry } from "./wayfinding";

let cached: FloorLevelEntry[] | null = null;

function parseLevels(value: unknown): FloorLevelEntry[] | null {
  if (!Array.isArray(value)) return null;
  const levels: FloorLevelEntry[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const row = item as FloorLevelEntry;
    if (
      typeof row.building !== "string" ||
      typeof row.level !== "string" ||
      typeof row.image !== "string" ||
      typeof row.alt !== "string"
    ) {
      return null;
    }
    levels.push(row);
  }
  return levels;
}

/** Loads public/floor/levels.json once per page load. */
export async function loadFloorLevels(): Promise<FloorLevelEntry[]> {
  if (cached) return cached;
  try {
    const response = await fetch("/floor/levels.json", { cache: "no-store" });
    if (response.ok) {
      const body: unknown = await response.json();
      const levels = parseLevels(body);
      if (levels) {
        cached = levels;
        return levels;
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
