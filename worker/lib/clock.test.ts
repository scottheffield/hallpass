import { describe, expect, it } from "vitest";
import { NOW_HEADER } from "../../shared/types";
import { now, parseOffsetDateTime } from "./clock";

describe("parseOffsetDateTime", () => {
  it("accepts ISO 8601 with a numeric offset", () => {
    const value = "2026-11-10T14:15:00-07:00";
    expect(parseOffsetDateTime(value)?.getTime()).toBe(Date.parse(value));
  });

  it("rejects Z, a missing offset, and impossible dates", () => {
    expect(parseOffsetDateTime("2026-11-10T14:15:00Z")).toBeNull();
    expect(parseOffsetDateTime("2026-11-10T14:15:00")).toBeNull();
    expect(parseOffsetDateTime("2026-02-31T00:00:00-07:00")).toBeNull();
    expect(parseOffsetDateTime("not-a-time")).toBeNull();
    expect(parseOffsetDateTime(null)).toBeNull();
  });
});

describe("now", () => {
  it("uses X-Hallpass-Now when the header has an offset", () => {
    const value = "2026-11-11T09:30:00-07:00";
    const request = new Request("https://hallpass.local/api/health", {
      headers: { [NOW_HEADER]: value },
    });
    expect(now(request).getTime()).toBe(Date.parse(value));
  });

  it("ignores an unparseable demo clock header", () => {
    const request = new Request("https://hallpass.local/api/health", {
      headers: { [NOW_HEADER]: "tomorrow" },
    });
    expect(Math.abs(now(request).getTime() - Date.now())).toBeLessThan(5_000);
  });
});
