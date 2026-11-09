import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("demo fixtures use real agenda ids and hinted rooms", async () => {
  const agenda = JSON.parse(await readFile(join(root, "public", "agenda.json"), "utf8"));
  const rooms = JSON.parse(await readFile(join(root, "public", "rooms.json"), "utf8"));
  const profile = JSON.parse(await readFile(join(root, "shared", "fixtures", "demo-profile.json"), "utf8"));
  const plan = JSON.parse(await readFile(join(root, "shared", "fixtures", "demo-plan.json"), "utf8"));
  const sample = JSON.parse(await readFile(join(root, "shared", "fixtures", "sessions-sample.json"), "utf8"));
  const byId = new Map(agenda.sessions.map((session) => [session.id, session]));
  const roomByName = new Map(rooms.map((room) => [room.name, room]));

  assert.equal(profile.attendee_id, "demo-alex");
  assert.equal(profile.role, "SRE");
  assert.equal(profile.energy, "medium");
  assert.equal(profile.pacing, "balanced");
  assert.equal(profile.attendee_id, plan.attendee_id);
  assert.match(profile.updated_at, /-07:00$/);
  assert.equal(sample.label, "agenda-backed");
  assert.equal(sample.note.toLowerCase().includes("not illustrative"), true);
  assert.equal(sample.sessions.length >= 15, true);
  for (const session of sample.sessions) {
    assert.equal(byId.has(session.id), true);
    assert.equal(session.title, byId.get(session.id).title);
  }

  const first = plan.days["2026-11-10"];
  assert.equal(first.items.length >= 3, true);
  assert.equal(first.items.some((item) => item.clash_note), true);
  assert.equal(first.items.some((item) => item.beat_alternative?.session_id), true);

  const planIds = [];
  for (const [day, block] of Object.entries(plan.days)) {
    for (const item of block.items) {
      planIds.push(item.session_id);
      const session = byId.get(item.session_id);
      assert.ok(session, `missing plan session ${item.session_id}`);
      assert.equal(session.start.slice(0, 10), day);
      assert.match(session.start, /-07:00$/);
      const room = roomByName.get(session.room);
      assert.ok(room, session.room);
      assert.equal(room.walking_hint.length > 0, true);
      if (item.beat_alternative) {
        const other = byId.get(item.beat_alternative.session_id);
        assert.ok(other);
        assert.equal(overlaps(session, other), true);
      }
    }
    for (const gap of block.breaks) {
      assert.match(gap.start, /T\d{2}:\d{2}:\d{2}-07:00$/);
      assert.match(gap.end, /T\d{2}:\d{2}:\d{2}-07:00$/);
    }
  }
  assert.equal(new Set(planIds).size, planIds.length);
  assert.equal(agenda.attribution.includes("The Linux Foundation"), true);
  assert.equal(JSON.stringify(agenda).includes("ELASTIC_API_KEY"), false);
});

function overlaps(a, b) {
  return a.start < b.end && b.start < a.end;
}
