import assert from "node:assert/strict";
import test from "node:test";
import { resolveSeedPrefix } from "./seed-demo-attendees.mjs";

test("resolveSeedPrefix allows dev prefixes by default", () => {
  assert.deepEqual(resolveSeedPrefix("hallpass-intake", undefined), { allowed: true, prefix: "hallpass-intake" });
});

test("resolveSeedPrefix refuses hallpass without opt-in", () => {
  assert.deepEqual(resolveSeedPrefix("hallpass", undefined), { allowed: false, prefix: "hallpass" });
  assert.deepEqual(resolveSeedPrefix(undefined, undefined), { allowed: false, prefix: "hallpass" });
  assert.deepEqual(resolveSeedPrefix("hallpass", "wrong"), { allowed: false, prefix: "hallpass" });
});

test("resolveSeedPrefix requires exact-match opt-in for hallpass", () => {
  assert.deepEqual(resolveSeedPrefix("hallpass", "hallpass"), { allowed: true, prefix: "hallpass" });
  assert.deepEqual(resolveSeedPrefix("  hallpass  ", "hallpass"), { allowed: true, prefix: "hallpass" });
});
