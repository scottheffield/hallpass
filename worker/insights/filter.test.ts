import { describe, expect, it } from "vitest";
import { checkInsOnAgenda } from "./filter";

describe("checkInsOnAgenda", () => {
  it("drops check-ins for sessions not on the agenda", () => {
    const agenda = new Set(["111", "222"]);
    const filtered = checkInsOnAgenda(
      [
        { session_id: "111", moved_goal: "yes" },
        { session_id: "bad-id", moved_goal: "no" },
        { session_id: "222", moved_goal: "a_little" },
      ],
      agenda,
    );
    expect(filtered).toEqual([
      { session_id: "111", moved_goal: "yes" },
      { session_id: "222", moved_goal: "a_little" },
    ]);
  });
});
