/** localStorage keys cleared by demo Start over. `hallpass.demo` is intentionally kept. */
export const DEMO_START_OVER_REMOVE_KEYS = [
  "hallpass.attendee_id",
  "hallpass.cache.plan",
  "hallpass.cache.profile",
  "hallpass.checkin.queue",
  "hallpass.demo_now",
] as const;

export const DEMO_START_OVER_KEEP_KEY = "hallpass.demo" as const;

export type DemoStartOverStorage = Pick<Storage, "removeItem">;

/** Removes attendee, cache, queue, and demo clock keys; leaves demo mode on. */
export function clearDemoAttendeeLocalStorage(storage: DemoStartOverStorage): void {
  for (const key of DEMO_START_OVER_REMOVE_KEYS) {
    storage.removeItem(key);
  }
}
