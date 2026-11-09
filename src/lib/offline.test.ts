import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CheckInRequest } from "../../shared/api";
import {
  checkInQueueId,
  conferenceIsoFromDate,
  flushCheckInQueue,
  isCheckInRequest,
  listQueuedCheckIns,
  setCheckInSender,
  upsertQueuedCheckIn,
} from "./offline";

describe("src/lib/offline check-in queue", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => store.clear(),
    });
    vi.stubGlobal("navigator", { onLine: true });
    vi.stubGlobal("window", {
      dispatchEvent: () => true,
      addEventListener: () => undefined,
    });
    setCheckInSender(async () => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const sample: CheckInRequest = {
    session_id: "sess-1",
    worth_it: "yes",
    moved_goal: "a_little",
    note: "Concrete examples would help.",
  };

  it("validates check-in bodies without echoing them", () => {
    expect(isCheckInRequest(sample)).toBe(true);
    expect(isCheckInRequest({ ...sample, worth_it: "maybe" })).toBe(false);
    expect(isCheckInRequest({ session_id: "" })).toBe(false);
  });

  it("uses attendee and session for a stable queue id", () => {
    expect(checkInQueueId("sess-1", "att-a")).toBe("att-a:sess-1");
  });

  it("overwrites the same session instead of duplicating", () => {
    upsertQueuedCheckIn(sample);
    upsertQueuedCheckIn({ ...sample, worth_it: "mixed" });
    const queue = listQueuedCheckIns();
    expect(queue).toHaveLength(1);
    expect(queue[0]?.body.worth_it).toBe("mixed");
  });

  it("flushes in order and stops on the first failure", async () => {
    upsertQueuedCheckIn(sample);
    upsertQueuedCheckIn({ ...sample, session_id: "sess-2" });
    const sent: string[] = [];
    setCheckInSender(async (body) => {
      if (body.session_id === "sess-2") throw new TypeError("offline");
      sent.push(body.session_id);
    });

    const count = await flushCheckInQueue();
    expect(count).toBe(1);
    expect(sent).toEqual(["sess-1"]);
    expect(listQueuedCheckIns().map((item) => item.body.session_id)).toEqual(["sess-2"]);
  });

  it("formats conference timestamps with the event offset", () => {
    const iso = conferenceIsoFromDate(new Date("2026-11-10T16:00:00.000Z"));
    expect(iso.endsWith("-07:00")).toBe(true);
    expect(iso.startsWith("2026-11-10T")).toBe(true);
  });
});
