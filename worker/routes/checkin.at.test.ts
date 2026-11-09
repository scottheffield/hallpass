import { describe, expect, it } from "vitest";
import { NOW_HEADER } from "../../shared/types";
import { resolveCheckInAt } from "./checkin";

describe("resolveCheckInAt", () => {
  it("uses server time when at is omitted", () => {
    const request = new Request("https://hallpass.local/api/checkin", {
      headers: { [NOW_HEADER]: "2026-11-10T14:00:00-07:00" },
    });
    expect(resolveCheckInAt(request, { session_id: "s1" })).toBe("2026-11-10T14:00:00-07:00");
  });

  it("keeps a past client timestamp from an offline flush", () => {
    const request = new Request("https://hallpass.local/api/checkin", {
      headers: { [NOW_HEADER]: "2026-11-10T14:00:00-07:00" },
    });
    expect(resolveCheckInAt(request, { at: "2026-11-10T10:05:00-07:00" })).toBe("2026-11-10T10:05:00-07:00");
  });

  it("clamps a future client timestamp to server now", () => {
    const request = new Request("https://hallpass.local/api/checkin", {
      headers: { [NOW_HEADER]: "2026-11-10T14:00:00-07:00" },
    });
    expect(resolveCheckInAt(request, { at: "2026-11-10T15:00:00-07:00" })).toBe("2026-11-10T14:00:00-07:00");
  });

  it("falls back to server now when client at is unparseable", () => {
    const request = new Request("https://hallpass.local/api/checkin", {
      headers: { [NOW_HEADER]: "2026-11-10T14:00:00-07:00" },
    });
    expect(resolveCheckInAt(request, { at: "not-a-time" })).toBe("2026-11-10T14:00:00-07:00");
  });
});
