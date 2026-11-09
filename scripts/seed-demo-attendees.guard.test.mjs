import assert from "node:assert/strict";
import { mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { pathsAreSameFile, resolveSeedPrefix } from "./seed-demo-attendees.mjs";

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

test("pathsAreSameFile matches symlinked paths", () => {
  const script = fileURLToPath(new URL("./seed-demo-attendees.mjs", import.meta.url));
  const dir = mkdtempSync(join(tmpdir(), "hallpass-seed-"));
  const link = join(dir, "seed-demo-attendees.mjs");
  symlinkSync(script, link);
  try {
    assert.equal(pathsAreSameFile(script, link), true);
    assert.equal(pathsAreSameFile(link, script), true);
  } finally {
    rmSync(dir, { recursive: true });
  }
});
