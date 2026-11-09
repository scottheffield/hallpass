import { describe, expect, it } from "vitest";
import { copyCaseText } from "./copy";

describe("copyCaseText", () => {
  it("fails on empty text", async () => {
    await expect(copyCaseText("   ")).resolves.toBe("failed");
  });
});
