import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultDemoNow, demoNowForRequests, isDemoMode, setDemoNow, syncDemoFromUrl } from "./clock";

describe("src/lib/clock", () => {
  const store = new Map<string, string>();
  const location = { search: "" };

  beforeEach(() => {
    store.clear();
    location.search = "";
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      clear: () => store.clear(),
    });
    vi.stubGlobal("window", {
      location,
      history: { replaceState: () => undefined },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("enables demo mode from ?demo=1 and sends a default conference time", () => {
    location.search = "?demo=1";
    syncDemoFromUrl();
    expect(isDemoMode()).toBe(true);
    expect(demoNowForRequests()).toBe(defaultDemoNow());
  });

  it("rejects demo times without a numeric offset", () => {
    location.search = "?demo=1";
    syncDemoFromUrl();
    expect(() => setDemoNow("2026-11-10T10:00:00Z")).toThrow();
    setDemoNow("2026-11-10T10:00:00-07:00");
    expect(demoNowForRequests()).toBe("2026-11-10T10:00:00-07:00");
  });
});
