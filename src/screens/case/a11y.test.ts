import { describe, expect, it } from "vitest";
import { CASE_COPY_STATUS_ROLE, CASE_SESSION_HEADING_LEVEL } from "./a11y";

describe("case a11y", () => {
  it("nests session titles under section headings", () => {
    expect(CASE_SESSION_HEADING_LEVEL).toBe(3);
  });

  it("announces copy feedback as status text", () => {
    expect(CASE_COPY_STATUS_ROLE).toBe("status");
  });
});
