import { describe, expect, it } from "vitest";
import { shouldBlockAskDismiss } from "./askDismiss";

describe("shouldBlockAskDismiss", () => {
  it("blocks while sending", () => {
    expect(shouldBlockAskDismiss({ sending: true, liveTextLength: 0 })).toBe(true);
  });

  it("blocks while streamed text is visible", () => {
    expect(shouldBlockAskDismiss({ sending: false, liveTextLength: 12 })).toBe(true);
  });

  it("allows dismiss when idle with no live stream", () => {
    expect(shouldBlockAskDismiss({ sending: false, liveTextLength: 0 })).toBe(false);
  });
});
