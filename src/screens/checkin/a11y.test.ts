import { describe, expect, it } from "vitest";
import {
  CHECKIN_SAVED_LABEL,
  CHECKIN_SESSION_HEADING_LEVEL,
  checkInProposalHeadingId,
  resolveSheetReturnFocus,
  shouldOverrideSheetReturnFocus,
} from "./a11y";

describe("checkInProposalHeadingId", () => {
  it("scopes the proposal heading id", () => {
    expect(checkInProposalHeadingId("abc")).toBe("checkin-proposal-why-abc");
  });
});

describe("shouldOverrideSheetReturnFocus", () => {
  it("runs only when the sheet is closed and returnFocusRef is provided", () => {
    expect(shouldOverrideSheetReturnFocus(true, true)).toBe(false);
    expect(shouldOverrideSheetReturnFocus(true, false)).toBe(false);
    expect(shouldOverrideSheetReturnFocus(false, false)).toBe(false);
    expect(shouldOverrideSheetReturnFocus(false, true)).toBe(true);
  });
});

describe("resolveSheetReturnFocus", () => {
  it("prefers a connected opener", () => {
    expect(resolveSheetReturnFocus({ isConnected: true }, { focus: () => {} })).toBe("opener");
  });

  it("falls back to the content root", () => {
    expect(resolveSheetReturnFocus({ isConnected: false }, { focus: () => {} })).toBe("content");
    expect(resolveSheetReturnFocus(null, { focus: () => {} })).toBe("content");
  });

  it("returns none when no target exists", () => {
    expect(resolveSheetReturnFocus(null, null)).toBe("none");
  });
});

describe("check-in a11y copy", () => {
  it("labels the saved step in plain text", () => {
    expect(CHECKIN_SAVED_LABEL.length).toBeGreaterThan(5);
  });

  it("nests the session title under the sheet heading", () => {
    expect(CHECKIN_SESSION_HEADING_LEVEL).toBe(3);
  });
});
