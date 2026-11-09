import { describe, expect, it } from "vitest";
import { buildCheckInRequest, NOTE_MAX, proposalChangeTexts, trimNote } from "./form";

describe("check-in form", () => {
  it("requires both ratings before submit", () => {
    expect(buildCheckInRequest("sess-1", "", "yes", "")).toBeNull();
    expect(buildCheckInRequest("sess-1", "mixed", "", "")).toBeNull();
    expect(buildCheckInRequest("", "yes", "no", "")).toBeNull();
  });

  it("puts trimmed notes in the body only when non-empty", () => {
    expect(buildCheckInRequest("sess-1", "yes", "a_little", "")).toEqual({
      session_id: "sess-1",
      worth_it: "yes",
      moved_goal: "a_little",
    });
    expect(buildCheckInRequest("sess-1", "mixed", "no", "  concrete examples  ")).toEqual({
      session_id: "sess-1",
      worth_it: "mixed",
      moved_goal: "no",
      note: "concrete examples",
    });
  });

  it("rejects notes over 280 characters instead of truncating", () => {
    const long = "a".repeat(300);
    expect(trimNote(long).length).toBe(300);
    expect(buildCheckInRequest("sess-1", "yes", "yes", long)).toBeNull();
    expect(buildCheckInRequest("sess-1", "yes", "yes", "a".repeat(NOTE_MAX))).not.toBeNull();
  });

  it("maps proposal changes to display lines", () => {
    expect(
      proposalChangeTexts([
        { kind: "added", session_id: "a", text: "Added a workshop." },
        { kind: "break", text: "   " },
        { kind: "removed", session_id: "b", text: "Dropped the overview." },
      ]),
    ).toEqual(["Added a workshop.", "Dropped the overview."]);
  });
});
