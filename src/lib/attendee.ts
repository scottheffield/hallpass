// Hallpass runs inside an event platform that handles login. For the demo, each browser
// gets its own random attendee ID so judges trying it at once don't overwrite each other.

const KEY = "hallpass.attendee_id";
let memoryId: string | null = null;

function newId(): string {
  return `demo_${crypto.randomUUID().replace(/-/g, "")}`;
}

export function getAttendeeId(): string {
  try {
    const existing = localStorage.getItem(KEY);
    if (existing) return existing;
    const id = newId();
    localStorage.setItem(KEY, id);
    return id;
  } catch {
    // Storage blocked (private mode, previews). Keep one ID for this page load.
    memoryId ??= newId();
    return memoryId;
  }
}
