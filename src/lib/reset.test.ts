import { describe, expect, it } from "vitest";
import {
  DEMO_START_OVER_KEEP_KEY,
  DEMO_START_OVER_REMOVE_KEYS,
  clearDemoAttendeeLocalStorage,
} from "./reset";

describe("clearDemoAttendeeLocalStorage", () => {
  it("removes exactly the start-over keys and keeps demo mode", () => {
    const store = new Map<string, string>([
      ...DEMO_START_OVER_REMOVE_KEYS.map((key) => [key, "x"] as const),
      [DEMO_START_OVER_KEEP_KEY, "1"],
      ["hallpass.unrelated", "stay"],
    ]);
    const removed: string[] = [];

    clearDemoAttendeeLocalStorage({
      removeItem: (key) => {
        removed.push(key);
        store.delete(key);
      },
    });

    expect(removed).toEqual([...DEMO_START_OVER_REMOVE_KEYS]);
    expect(store.has(DEMO_START_OVER_KEEP_KEY)).toBe(true);
    expect(store.get("hallpass.unrelated")).toBe("stay");
    for (const key of DEMO_START_OVER_REMOVE_KEYS) {
      expect(store.has(key)).toBe(false);
    }
  });
});
